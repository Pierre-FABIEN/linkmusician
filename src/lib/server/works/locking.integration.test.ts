/** ARCH-MET-02a : ordonnancement imposé par barrières, schéma e2e uniquement. */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import { createPrismaClient } from '../../../../prisma/client.js';
import { seedMilestones } from '../../../../prisma/seed-referentials.js';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
if (enabled) process.env.DATABASE_URL = url.toString();
const db = createPrismaClient(url.toString());
vi.mock('#lib/server', () => ({ prisma: db }));
const works = await import('./service');
const bands = await import('../bands/service');
const collabs = await import('../collaborations/service');
const { emitAndProcess, lockProgressActors } = await import('../progression/processor');
const { pendingSucceededIntroductions, markSucceeded } = await import('../career/introductions');
const prefix = `lock-order-${Date.now()}-`;
const actors: string[] = [];
const users: string[] = [];
const transaction = db.$transaction.bind(db);
const role = { kind: 'COMPOSITION' as const, instrumentSlug: null };
const now = new Date('2026-11-15T12:00:00Z');

function barrier() {
	let release!: () => void;
	const promise = new Promise<void>((resolve) => {
		release = resolve;
	});
	return { promise, release };
}

async function reached(signal: Promise<void>) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			signal,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error('barrière non atteinte')), 20000);
			})
		]);
	} finally {
		clearTimeout(timer);
	}
}

/** Intercepte une seule vraie transaction ; aucune simulation du moteur/SQL.
 * Les échecs restent bornés côté PostgreSQL, même sur la version antérieure. */
function observeNext(
	hook: (key: string, run: () => Promise<number>) => Promise<number>,
	failAct = false
) {
	const spy = vi.spyOn(db, '$transaction');
	spy.mockImplementationOnce((async (
		callback: (tx: Prisma.TransactionClient) => Promise<unknown>
	) => {
		spy.mockRestore();
		return transaction(
			async (tx) => {
				await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '6s'");
				const observed = new Proxy(tx, {
					get(target, property) {
						if (property === 'workCreditAct' && failAct)
							return new Proxy(target.workCreditAct, {
								get(delegate, method) {
									if (method === 'create') return () => Promise.reject(new Error('acte refusé'));
									return Reflect.get(delegate, method);
								}
							});
						if (property === '$executeRaw')
							return (...args: Parameters<Prisma.TransactionClient['$executeRaw']>) =>
								hook(String(args[1]), () => target.$executeRaw(...args));
						const value = Reflect.get(target, property);
						return typeof value === 'function' ? value.bind(target) : value;
					}
				});
				return callback(observed);
			},
			{ timeout: 40000 }
		);
	}) as typeof db.$transaction);
	return spy;
}

async function fixture(label: string, formed = false) {
	const ids: string[] = [];
	for (const name of ['a-member', 'b-owner', 'c-author', 'd-engineer']) {
		const user = await db.user.create({
			data: {
				email: `${prefix}${label}-${name}@example.test`,
				referralCode: `${prefix}${label}-${name}`
			}
		});
		users.push(user.id);
		const person = await db.actor.create({
			data: {
				id: `${name}-${prefix}${label}`,
				kind: 'PERSON',
				handle: `${prefix}${label}-${name}`,
				displayName: name,
				trustLevel: 2,
				person: {
					create: {
						userId: user.id,
						birthDate: new Date('1990-01-01'),
						termsAcceptedAt: now,
						onboardedAt: now,
						tracks: {
							create: {
								track: name === 'd-engineer' ? 'SOUND_ENGINEER' : 'MUSICIAN',
								isPrimary: true
							}
						}
					}
				}
			}
		});
		actors.push(person.id);
		ids.push(person.id);
	}
	const [member, owner, author, engineer] = ids;
	const band = await bands.createBand(owner, { name: `${prefix}${label}`, title: null }, now);
	actors.push(band.id);
	await bands.inviteToBand(
		band.id,
		owner,
		{ handle: `${prefix}${label}-a-member`, title: null },
		now
	);
	const invite = await db.membership.findFirstOrThrow({
		where: { orgId: band.id, personId: member, status: 'INVITED' }
	});
	if (formed) await bands.answerInvite(invite.id, member, true, now);
	const work = await works.createWork(
		owner,
		{ title: label, band: band.handle, genreIds: [], roles: [role] },
		now
	);
	await works.creditPerson(
		work.id,
		owner,
		{ handle: `${prefix}${label}-c-author`, roles: [role] },
		now
	);
	if (!label.startsWith('confirm')) await works.confirmCredit(work.id, author, now);
	const media = await db.media.create({
		data: {
			actorId: band.id,
			kind: 'EXTERNAL_LINK',
			provider: 'YOUTUBE',
			externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			title: 'Maquette',
			status: 'PUBLISHED'
		}
	});
	await works.setDemo(work.id, owner, { mediaId: media.id });
	return { member, owner, author, engineer, band, work, invite };
}

async function recording(f: Awaited<ReturnType<typeof fixture>>) {
	const conversation = await db.conversation.create({
		data: {
			pairKey: [f.owner, f.engineer].sort().join(':'),
			initiatorId: f.owner,
			participants: {
				create: [
					{ actorId: f.owner, state: 'ACCEPTED' },
					{ actorId: f.engineer, state: 'ACCEPTED' }
				]
			}
		}
	});
	const collab = await db.collaboration.create({
		data: {
			conversationId: conversation.id,
			proposedById: f.owner,
			kind: 'RECORDING',
			title: 'Prise',
			happenedOn: new Date('2026-11-14'),
			workId: f.work.id,
			status: 'ACCEPTED',
			participants: {
				create: [
					{ actorId: f.owner, acceptedAt: now },
					{
						actorId: f.engineer,
						service: 'RECORDING',
						acceptedAt: now,
						confirmedCompletionAt: now
					}
				]
			}
		}
	});
	return collab;
}

/** L'adhésion détient band:, le morceau arrive ensuite à ce verrou.
 * Sur l'ancien code, le morceau a déjà verrouillé owner : cycle réel. */
async function againstJoin(
	f: Awaited<ReturnType<typeof fixture>>,
	action: () => Promise<unknown>,
	failAct = false
) {
	const held = barrier();
	const release = barrier();
	const waiting = barrier();
	observeNext(async (key, run) => {
		const result = await run();
		if (key === `band:${f.band.id}`) {
			held.release();
			await release.promise;
		}
		return result;
	});
	const joining = bands.answerInvite(f.invite.id, f.member, true, now);
	await reached(held.promise);
	const requested: string[] = [];
	observeNext(async (key, run) => {
		requested.push(key);
		if (key === `band:${f.band.id}`) waiting.release();
		return run();
	}, failAct);
	const changing = action();
	const finished = Promise.all([joining, changing]);
	void finished.catch(() => {});
	try {
		await reached(waiting.promise);
	} finally {
		release.release();
	}
	await finished;
	const beforeBand = requested.slice(0, requested.indexOf(`band:${f.band.id}`));
	expect(
		beforeBand.every((key) => key.startsWith('work:') || key.startsWith('collaboration:'))
	).toBe(true);
}

/** Un autre événement tient l'acteur le plus petit. L'orchestration doit
 * l'attendre avant de prendre un acteur requis seulement par sa première émission. */
async function againstActor(
	f: Awaited<ReturnType<typeof fixture>>,
	action: () => Promise<unknown>
) {
	const held = barrier();
	const release = barrier();
	const waiting = barrier();
	const competing = transaction(
		async (tx) => {
			await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '6s'");
			await lockProgressActors(tx, [f.member]);
			held.release();
			await release.promise;
			return emitAndProcess(tx, {
				type: 'conversation.reciprocated',
				actorId: f.member,
				counterpartId: f.owner,
				fromOpportunity: false
			});
		},
		{ timeout: 40000 }
	);
	await reached(held.promise);
	observeNext(async (key, run) => {
		if (key === f.member) waiting.release();
		return run();
	});
	const composing = action();
	const finished = Promise.all([competing, composing]);
	void finished.catch(() => {});
	try {
		await reached(waiting.promise);
	} finally {
		release.release();
	}
	await finished;
}

describe.skipIf(!enabled)('ordre des verrous métier / acteurs', { timeout: 90000 }, () => {
	beforeAll(async () => {
		await seedMilestones(db);
	});
	afterAll(async () => {
		vi.restoreAllMocks();
		await db.collaboration.deleteMany({ where: { proposedById: { in: actors } } });
		await db.conversation.deleteMany({ where: { initiatorId: { in: actors } } });
		await db.actor.deleteMany({ where: { id: { in: actors } } });
		await db.user.deleteMany({ where: { id: { in: users } } });
		await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: actors } } });
		await db.$disconnect();
	});

	it('composition corroborée contre formation : les deux terminent, une seule preuve', async () => {
		const f = await fixture('compose');
		await againstJoin(f, () => works.markComposed(f.work.id, f.owner, now));
		expect((await db.work.findUniqueOrThrow({ where: { id: f.work.id } })).proof).toBe(
			'CORROBORATED'
		);
		expect(
			(
				await db.milestone.findUniqueOrThrow({
					where: { bandId_definitionId: { bandId: f.band.id, definitionId: 'FIRST_COMPOSITION' } }
				})
			).proof
		).toBe('CORROBORATED');
		expect(
			await db.domainEvent.count({
				where: { type: 'work.composed', payload: { path: ['workId'], equals: f.work.id } }
			})
		).toBe(1);
	});

	it('confirmation qui corrobore contre adhésion : même transaction et mêmes crédits', async () => {
		const f = await fixture('confirm');
		await works.markComposed(f.work.id, f.owner, now);
		await againstJoin(f, () => works.confirmCredit(f.work.id, f.author, now));
		expect((await db.work.findUniqueOrThrow({ where: { id: f.work.id } })).proof).toBe(
			'CORROBORATED'
		);
		expect(
			await db.workCreditAct.count({
				where: { workId: f.work.id, kind: 'CONFIRMED', personId: f.author }
			})
		).toBe(1);
	});

	it('finalisation recording contre adhésion du pro : band avant acteurs, affiliation relue', async () => {
		const f = await fixture('recording', true);
		// Le pro rejoint le groupe : il ne pourra plus en vérifier l’étape.
		await bands.inviteToBand(
			f.band.id,
			f.owner,
			{ handle: `${prefix}recording-d-engineer`, title: null },
			now
		);
		const invite = await db.membership.findFirstOrThrow({
			where: { orgId: f.band.id, personId: f.engineer, status: 'INVITED' }
		});
		const collab = await recording(f);
		await againstJoin({ ...f, invite, member: f.engineer }, () =>
			collabs.confirmCollaboration(f.owner, collab.id, now)
		);
		expect((await db.collaboration.findUniqueOrThrow({ where: { id: collab.id } })).status).toBe(
			'COMPLETED'
		);
		expect(
			await db.milestone.count({ where: { bandId: f.band.id, definitionId: 'FIRST_RECORDING' } })
		).toBe(0);
		expect(
			await db.workRole.count({
				where: { workId: f.work.id, kind: 'RECORDING', contributor: { personId: f.engineer } }
			})
		).toBe(1);
	});

	it('dissolution pendant l’attente : le morceau ne passe pas composé', async () => {
		const f = await fixture('dissolved');
		const held = barrier();
		const release = barrier();
		const waiting = barrier();
		observeNext(async (key, run) => {
			const result = await run();
			if (key === `band:${f.band.id}`) {
				held.release();
				await release.promise;
			}
			return result;
		});
		const leaving = bands.leaveBand(f.band.id, f.owner, now);
		await reached(held.promise);
		observeNext(async (key, run) => {
			if (key === `band:${f.band.id}`) waiting.release();
			return run();
		});
		const composing = expect(works.markComposed(f.work.id, f.owner, now)).rejects.toThrow(
			'Ce morceau n’existe plus.'
		);
		const finished = Promise.all([leaving, composing]);
		void finished.catch(() => {});
		try {
			await reached(waiting.promise);
		} finally {
			release.release();
		}
		await finished;
		expect((await db.work.findUniqueOrThrow({ where: { id: f.work.id } })).state).toBe('IDEA');
		expect(
			await db.domainEvent.count({
				where: { type: 'work.composed', payload: { path: ['workId'], equals: f.work.id } }
			})
		).toBe(0);
	});

	it('suppression du morceau pendant l’attente : finalisation sans référence ni crédit orphelin', async () => {
		const f = await fixture('deleted', true);
		const collab = await recording(f);
		const held = barrier();
		const release = barrier();
		const waiting = barrier();
		observeNext(async (key, run) => {
			const result = await run();
			if (key === `work:${f.work.id}`) {
				held.release();
				await release.promise;
			}
			return result;
		});
		const deleting = works.deleteWork(f.work.id, f.owner);
		await reached(held.promise);
		observeNext(async (key, run) => {
			if (key === `work:${f.work.id}`) waiting.release();
			return run();
		});
		const completing = collabs.confirmCollaboration(f.owner, collab.id, now);
		const finished = Promise.all([deleting, completing]);
		void finished.catch(() => {});
		try {
			await reached(waiting.promise);
		} finally {
			release.release();
		}
		await finished;
		const final = await db.collaboration.findUniqueOrThrow({ where: { id: collab.id } });
		expect(final.status).toBe('COMPLETED');
		expect(final.workId).toBeNull();
		expect(await db.workContributor.count({ where: { workId: f.work.id } })).toBe(0);
		expect(
			await db.milestone.count({ where: { bandId: f.band.id, definitionId: 'FIRST_RECORDING' } })
		).toBe(0);
	});

	it('échec après les événements : rollback du crédit, preuve et XP, adhésion conservée', async () => {
		const f = await fixture('confirm-rollback');
		await works.markComposed(f.work.id, f.owner, now);
		await againstJoin(
			f,
			async () => {
				await expect(works.confirmCredit(f.work.id, f.author, now)).rejects.toThrow('acte refusé');
			},
			true
		);
		expect((await db.work.findUniqueOrThrow({ where: { id: f.work.id } })).proof).toBe('DECLARED');
		expect(
			(
				await db.workContributor.findUniqueOrThrow({
					where: { workId_personId: { workId: f.work.id, personId: f.author } }
				})
			).confirmedAt
		).toBeNull();
		expect(
			await db.domainEvent.count({
				where: { type: 'work.composed', payload: { path: ['workId'], equals: f.work.id } }
			})
		).toBe(0);
		expect(await db.xpTransaction.count({ where: { actorId: f.author } })).toBe(0);
		expect((await db.membership.findUniqueOrThrow({ where: { id: f.invite.id } })).status).toBe(
			'ACTIVE'
		);
	});

	it('présentation candidate lue par deux finalisations : un seul acte de réussite', async () => {
		const f = await fixture('introduction');
		const collab = await recording(f);
		const intro = await db.introduction.create({
			data: {
				introducerId: f.member,
				firstId: f.owner,
				secondId: f.engineer,
				createdAt: new Date(now.getTime() - 86400000)
			}
		});
		const read = barrier();
		let readers = 0;
		const settleIntroduction = () =>
			transaction(
				async (tx) => {
					const candidates = await pendingSucceededIntroductions(tx, [f.owner, f.engineer]);
					if (++readers === 2) read.release();
					await reached(read.promise);
					await lockProgressActors(tx, [f.member, f.owner, f.engineer]);
					await markSucceeded(
						tx,
						{ id: collab.id, participantIds: [f.owner, f.engineer] },
						now,
						candidates
					);
				},
				{ timeout: 40000 }
			);
		await Promise.all([settleIntroduction(), settleIntroduction()]);
		expect(
			(await db.introduction.findUniqueOrThrow({ where: { id: intro.id } })).succeededAt
		).toEqual(now);
		expect(
			await db.domainEvent.count({
				where: {
					type: 'introduction.succeeded',
					payload: { path: ['introductionId'], equals: intro.id }
				}
			})
		).toBe(1);
	});

	it('formation : union des membres avant les émissions membership puis milestones', async () => {
		const f = await fixture('formation-union');
		await works.markComposed(f.work.id, f.owner, now);
		await againstActor(f, () => bands.answerInvite(f.invite.id, f.member, true, now));
		expect(await db.milestone.count({ where: { bandId: f.band.id } })).toBe(2);
	});

	it('enregistrement : les membres absents de la session précèdent les participant·es', async () => {
		const f = await fixture('recording-union', true);
		const collab = await recording(f);
		await againstActor(f, () => collabs.confirmCollaboration(f.owner, collab.id, now));
		expect((await db.collaboration.findUniqueOrThrow({ where: { id: collab.id } })).status).toBe(
			'COMPLETED'
		);
		expect(
			await db.milestone.count({ where: { bandId: f.band.id, definitionId: 'FIRST_RECORDING' } })
		).toBe(1);
	});

	it('présentateur extérieur : verrouillé avant les participant·es de la collaboration', async () => {
		const f = await fixture('introducer-union');
		// Un morceau personnel isole la présentation de l’union des membres du groupe.
		await db.work.update({ where: { id: f.work.id }, data: { ownerId: f.owner } });
		const collab = await recording(f);
		const intro = await db.introduction.create({
			data: {
				introducerId: f.member,
				firstId: f.owner,
				secondId: f.engineer,
				createdAt: new Date(now.getTime() - 86400000)
			}
		});
		await againstActor(f, () => collabs.confirmCollaboration(f.owner, collab.id, now));
		expect(
			(await db.introduction.findUniqueOrThrow({ where: { id: intro.id } })).succeededAt
		).toEqual(now);
		expect(
			await db.domainEvent.count({
				where: {
					type: 'introduction.succeeded',
					payload: { path: ['introductionId'], equals: intro.id }
				}
			})
		).toBe(1);
	});

	it('union des acteurs : un membre antérieur précède les auteurs du morceau', async () => {
		const f = await fixture('union', true);
		await bands.leaveBand(f.band.id, f.member, new Date(now.getTime() + 1));
		await againstActor(f, () => works.markComposed(f.work.id, f.owner, now));
		expect(
			await db.milestone.count({ where: { bandId: f.band.id, definitionId: 'FIRST_COMPOSITION' } })
		).toBe(1);
	});
});
