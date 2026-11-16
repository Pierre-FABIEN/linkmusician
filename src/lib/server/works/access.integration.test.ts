/** ARCH-MET-02b : gestion et révocation imposées par barrières, schéma e2e uniquement. */
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
const oembed = await import('../media/oembed');
const { getPublishedMedia } = await import('../media/service');

const prefix = `work-access-${Date.now()}-`;
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
	failAct = false,
	beforeWrite?: () => Promise<void>
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
						if (property === 'work' && beforeWrite)
							return new Proxy(target.work, {
								get(delegate, method) {
									if (method === 'update')
										return async (...args: Parameters<typeof delegate.update>) => {
											await beforeWrite();
											return delegate.update(...args);
										};
									return Reflect.get(delegate, method);
								}
							});
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

async function fixture(label: string) {
	const ids: string[] = [];
	for (const name of ['owner', 'admin', 'other']) {
		const user = await db.user.create({
			data: {
				email: `${prefix}${label}-${name}@example.test`,
				referralCode: `${prefix}${label}-${name}`
			}
		});
		users.push(user.id);
		const actor = await db.actor.create({
			data: {
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
						tracks: { create: { track: 'MUSICIAN', isPrimary: true } }
					}
				}
			}
		});
		actors.push(actor.id);
		ids.push(actor.id);
	}
	const [owner, admin, other] = ids;
	const band = await bands.createBand(owner, { name: `${prefix}${label}`, title: null }, now);
	actors.push(band.id);
	const membership = await db.membership.create({
		data: { orgId: band.id, personId: admin, status: 'ACTIVE', role: 'ADMIN', startedAt: now }
	});
	const work = await works.createWork(
		owner,
		{ title: label, band: band.handle, genreIds: [], roles: [role] },
		now
	);
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
	const open = await db.workRole.create({ data: { workId: work.id, kind: 'LYRICS' } });
	const pending = await db.workContributor.create({ data: { workId: work.id, personId: other } });
	return { owner, admin, other, band, membership, work, media, open, pending, workTitle: label };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;
const mutations: Record<string, (f: Fixture, personId: string) => Promise<unknown>> = {
	create: (f, id) =>
		works.createWork(id, { title: 'Interdit', band: f.band.handle, genreIds: [], roles: [role] }),
	update: (f, id) => works.updateWork(f.work.id, id, { title: 'Interdit', genreIds: [] }),
	delete: (f, id) => works.deleteWork(f.work.id, id),
	open: (f, id) => works.addOpenRole(f.work.id, id, { kind: 'ARRANGEMENT', instrumentSlug: null }),
	remove: (f, id) => works.removeOpenRole(f.work.id, id, f.open.id),
	credit: (f, id) =>
		works.creditPerson(f.work.id, id, { handle: `${prefix}${f.workTitle}-admin`, roles: [role] }),
	withdraw: (f, id) => works.withdrawCredit(f.work.id, id, f.pending.id),
	demo: (f, id) => works.setDemo(f.work.id, id, { mediaId: f.media.id }),
	link: (f, id) =>
		works.setDemo(f.work.id, id, {
			url: 'https://youtu.be/dQw4w9WgXcQ',
			title: 'Nouvelle maquette'
		}),
	compose: (f, id) => works.markComposed(f.work.id, id, now)
};

async function state(f: Fixture) {
	return {
		works: await db.work.findMany({ where: { ownerId: f.band.id }, orderBy: { id: 'asc' } }),
		credits: await db.workContributor.findMany({
			where: { workId: f.work.id },
			orderBy: { id: 'asc' }
		}),
		roles: await db.workRole.findMany({ where: { workId: f.work.id }, orderBy: { id: 'asc' } }),
		acts: await db.workCreditAct.count({ where: { workId: f.work.id } }),
		media: await db.media.findMany({ where: { actorId: f.band.id }, orderBy: { id: 'asc' } }),
		events: await db.domainEvent.count({ where: { actorIds: { hasSome: [f.band.id, f.admin] } } }),
		xp: await db.xpTransaction.count({ where: { actorId: { in: [f.band.id, f.admin] } } })
	};
}

async function againstRevocation(f: Fixture, mutation: () => Promise<unknown>, remove: boolean) {
	const held = barrier(),
		release = barrier(),
		waiting = barrier();
	observeNext(async (key, run) => {
		const value = await run();
		if (key === `band:${f.band.id}`) {
			held.release();
			await release.promise;
		}
		return value;
	});
	const revoke = remove
		? bands.removeMember(f.membership.id, f.owner, now)
		: bands.setRole(f.membership.id, f.owner, 'MEMBER', now);
	await reached(held.promise);
	const keys: string[] = [];
	observeNext(async (key, run) => {
		keys.push(key);
		if (key === `band:${f.band.id}`) waiting.release();
		return run();
	});
	const result = mutation().then(
		() => null,
		(error) => error
	);
	try {
		await reached(waiting.promise);
	} finally {
		release.release();
	}
	await revoke;
	expect(await result).toMatchObject({ status: 403 });
	expect(keys[0]).toMatch(/^work:/);
	expect(keys[1]).toBe(`band:${f.band.id}`);
}

describe.skipIf(!enabled)('gestion Work et révocation (PostgreSQL)', { timeout: 60000 }, () => {
	beforeAll(async () => {
		await seedMilestones(db);
	});
	afterAll(async () => {
		vi.restoreAllMocks();
		await db.actor.deleteMany({ where: { id: { in: actors } } });
		await db.user.deleteMany({ where: { id: { in: users } } });
		await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: actors } } });
		await db.$disconnect();
	});
	it('R2 : rétrogradation validée pendant l’attente, le renommage doit être refusé', async () => {
		const f = await fixture('r2');
		const held = barrier(),
			release = barrier(),
			waiting = barrier(),
			committed = barrier();
		observeNext(async (key, run) => {
			const result = await run();
			if (key === `band:${f.band.id}`) {
				held.release();
				await release.promise;
			}
			return result;
		});
		const revoking = bands
			.setRole(f.membership.id, f.owner, 'MEMBER', now)
			.then(() => committed.release());
		await reached(held.promise);
		// Ancien code : la permission est lue sans band, puis l'écriture attend.
		// Code corrigé : la lecture attend band, avant toute décision de gestion.
		observeNext(
			async (key, run) => {
				if (key === `band:${f.band.id}`) waiting.release();
				return run();
			},
			false,
			async () => {
				waiting.release();
				await committed.promise;
			}
		);
		const changing = works.updateWork(f.work.id, f.admin, { title: 'Interdit', genreIds: [] });
		const result = changing.then(
			() => null,
			(error) => error
		);
		try {
			await reached(waiting.promise);
		} finally {
			release.release();
		}
		await revoking;
		expect(await result).toMatchObject({ status: 403 });
		expect((await db.work.findUniqueOrThrow({ where: { id: f.work.id } })).title).toBe('r2');
	});
	for (const remove of [false, true]) {
		for (const [name, mutate] of Object.entries(mutations)) {
			it(`${name} refuse après ${remove ? 'retrait' : 'rétrogradation'} validé pendant l’attente`, async () => {
				const f = await fixture(`${name}-${remove}`);
				const before = await state(f);
				await againstRevocation(f, () => mutate(f, f.admin), remove);
				expect(await state(f)).toEqual(before);
			});
		}
	}

	it('une mutation sérialisée avant la révocation peut terminer', async () => {
		const f = await fixture('before-revoke');
		const held = barrier(),
			release = barrier(),
			waiting = barrier();
		observeNext(async (key, run) => {
			const value = await run();
			if (key === `band:${f.band.id}`) {
				held.release();
				await release.promise;
			}
			return value;
		});
		const mutation = works.updateWork(f.work.id, f.admin, { title: 'Autorisé', genreIds: [] });
		await reached(held.promise);
		observeNext(async (key, run) => {
			if (key === `band:${f.band.id}`) waiting.release();
			return run();
		});
		const revocation = bands.removeMember(f.membership.id, f.owner, now);
		try {
			await reached(waiting.promise);
		} finally {
			release.release();
		}
		await Promise.all([mutation, revocation]);
		expect((await db.work.findUniqueOrThrow({ where: { id: f.work.id } })).title).toBe('Autorisé');
	});

	for (const name of ['demo', 'link'] as const) {
		it(`suppression du morceau pendant l’attente de ${name} : 404 et aucun média orphelin`, async () => {
			const f = await fixture(`delete-${name}`);
			const held = barrier(),
				release = barrier(),
				waiting = barrier();
			observeNext(async (key, run) => {
				const value = await run();
				if (key === `work:${f.work.id}`) {
					held.release();
					await release.promise;
				}
				return value;
			});
			const deleting = works.deleteWork(f.work.id, f.owner);
			await reached(held.promise);
			observeNext(async (key, run) => {
				if (key === `work:${f.work.id}`) waiting.release();
				return run();
			});
			const result = mutations[name](f, f.admin).then(
				() => null,
				(error) => error
			);
			try {
				await reached(waiting.promise);
			} finally {
				release.release();
			}
			await deleting;
			expect(await result).toMatchObject({ status: 404 });
			expect(await db.media.count({ where: { actorId: f.band.id } })).toBe(1);
			expect(await db.media.findUnique({ where: { id: f.media.id } })).not.toBeNull();
			expect(await db.workCreditAct.count({ where: { workId: f.work.id } })).toBe(0);
		});
	}

	it('oEmbed hors transaction : révocation pendant la préparation, aucun effet à compenser', async () => {
		const f = await fixture('network');
		const entered = barrier(),
			release = barrier();
		const fetch = vi.spyOn(oembed, 'fetchExternalTitle').mockImplementationOnce(async () => {
			entered.release();
			await release.promise;
			return 'Titre réseau';
		});
		const txSpy = vi.spyOn(db, '$transaction');
		const before = await state(f);
		const result = works
			.setDemo(f.work.id, f.admin, { url: 'https://youtu.be/dQw4w9WgXcQ', title: ' ' })
			.then(
				() => null,
				(error) => error
			);
		try {
			await reached(entered.promise);
			expect(txSpy).not.toHaveBeenCalled();
			await bands.removeMember(f.membership.id, f.owner, now);
		} finally {
			release.release();
		}
		expect(await result).toMatchObject({ status: 403 });
		expect(await state(f)).toEqual(before);
		fetch.mockRestore();
		txSpy.mockRestore();
	});

	it('échec après publication : rollback du média, événement, projections et association ; média partagé conservé', async () => {
		const f = await fixture('media-rollback');
		const otherWork = await works.createWork(f.owner, {
			title: 'Partagé',
			band: f.band.handle,
			genreIds: [],
			roles: [role]
		});
		await works.setDemo(otherWork.id, f.owner, { mediaId: f.media.id });
		const before = await state(f);
		const actorBefore = await db.actor.findUnique({ where: { id: f.band.id } });
		observeNext(
			async (_key, run) => run(),
			false,
			async () => {
				throw new Error('association refusée');
			}
		);
		await expect(mutations.link(f, f.admin)).rejects.toThrow('association refusée');
		expect(await state(f)).toEqual(before);
		expect(await db.actor.findUnique({ where: { id: f.band.id } })).toEqual(actorBefore);
		expect((await db.work.findUniqueOrThrow({ where: { id: otherWork.id } })).demoMediaId).toBe(
			f.media.id
		);
	});

	it('rôle attribué pendant l’attente : le DELETE conditionnel ne retire pas le rôle crédité', async () => {
		const f = await fixture('role-assignment');
		const held = barrier(),
			release = barrier(),
			waiting = barrier();
		observeNext(async (key, run) => {
			const value = await run();
			if (key === `work:${f.work.id}`) {
				held.release();
				await release.promise;
			}
			return value;
		});
		const assigning = works.creditPerson(f.work.id, f.owner, {
			handle: `${prefix}role-assignment-admin`,
			roles: [{ kind: 'LYRICS', instrumentSlug: null }]
		});
		await reached(held.promise);
		observeNext(async (key, run) => {
			if (key === `work:${f.work.id}`) waiting.release();
			return run();
		});
		const result = works.removeOpenRole(f.work.id, f.admin, f.open.id).then(
			() => null,
			(error) => error
		);
		try {
			await reached(waiting.promise);
		} finally {
			release.release();
		}
		await assigning;
		expect(await result).toMatchObject({ status: 404 });
		expect(
			(await db.workRole.findUniqueOrThrow({ where: { id: f.open.id } })).contributorId
		).not.toBeNull();
		const otherWork = await works.createWork(f.owner, {
			title: 'Autre',
			band: null,
			genreIds: [],
			roles: [role]
		});
		const otherRole = await db.workRole.create({ data: { workId: otherWork.id, kind: 'LYRICS' } });
		await expect(works.removeOpenRole(f.work.id, f.owner, otherRole.id)).rejects.toMatchObject({
			status: 404
		});
		expect(await db.workRole.findUnique({ where: { id: otherRole.id } })).not.toBeNull();
	});

	it('listes, équipe et public : MEMBER et crédit ne donnent jamais la gestion', async () => {
		const f = await fixture('access');
		expect((await works.manageableWorks(f.admin)).map((w) => w.id)).toContain(f.work.id);
		expect((await bands.managedBands(f.admin)).map((b) => b.id)).toContain(f.band.id);
		await bands.setRole(f.membership.id, f.owner, 'MEMBER');
		expect(await works.workPage(f.work.id, f.admin)).toMatchObject({ team: true, manage: false });
		expect(await works.workPage(f.work.id, f.other)).toMatchObject({ team: true, manage: false });
		expect(await works.workPage(f.work.id, null)).toBeNull();
		expect((await works.manageableWorks(f.admin)).map((w) => w.id)).not.toContain(f.work.id);
		expect((await bands.managedBands(f.admin)).map((b) => b.id)).not.toContain(f.band.id);
		const third = await fixture('third-with-crafts');
		await db.personTrack.createMany({
			data: [
				{ personId: third.owner, track: 'SOUND_ENGINEER' },
				{ personId: third.owner, track: 'PRODUCER' }
			]
		});
		expect(await works.workPage(f.work.id, third.owner)).toBeNull();
		for (const mutate of Object.values(mutations)) {
			await expect(mutate(f, f.admin)).rejects.toMatchObject({ status: 403 });
			await expect(mutate(f, f.other)).rejects.toMatchObject({ status: 403 });
			await expect(mutate(f, third.owner)).rejects.toMatchObject({ status: 403 });
		}
		await works.markComposed(f.work.id, f.owner, now);
		expect(await works.workPage(f.work.id, null)).toMatchObject({
			team: false,
			manage: false,
			credits: [expect.objectContaining({ confirmed: true })]
		});
	});
	for (const removal of ['deleted', 'rejected'] as const) {
		it(`média ${removal} pendant l’attente : relire sa disponibilité avant l’association`, async () => {
			const f = await fixture(`media-${removal}`);
			const held = barrier(),
				release = barrier(),
				waiting = barrier();
			observeNext(async (key, run) => {
				const value = await run();
				if (key === `work:${f.work.id}`) {
					held.release();
					await release.promise;
				}
				return value;
			});
			const first = works.updateWork(f.work.id, f.owner, { title: 'Premier', genreIds: [] });
			await reached(held.promise);
			observeNext(async (key, run) => {
				if (key === `work:${f.work.id}`) waiting.release();
				return run();
			});
			const result = works.setDemo(f.work.id, f.admin, { mediaId: f.media.id }).then(
				() => null,
				(error) => error
			);
			try {
				await reached(waiting.promise);
				if (removal === 'deleted') await db.media.delete({ where: { id: f.media.id } });
				else await db.media.update({ where: { id: f.media.id }, data: { status: 'REJECTED' } });
			} finally {
				release.release();
			}
			await first;
			expect(await result).toMatchObject({ status: 404 });
			if (removal === 'rejected')
				expect(await db.media.findUnique({ where: { id: f.media.id } })).not.toBeNull();
		});
	}
	for (const change of ['revoke', 'delete', 'dissolve'] as const) {
		it(`préparation réseau puis ${change} : aucun verrou SQL ni effet média à compenser`, async () => {
			const f = await fixture(`network-${change}`);
			const started = barrier(),
				release = barrier();
			const spy = vi.spyOn(oembed, 'fetchExternalTitle').mockImplementationOnce(async () => {
				started.release();
				await release.promise;
				return 'Titre réseau';
			});
			const result = works
				.setDemo(f.work.id, f.admin, { url: 'https://youtu.be/dQw4w9WgXcQ', title: ' ' })
				.then(
					() => null,
					(error) => error
				);
			try {
				await reached(started.promise);
				// Ces commandes doivent terminer AVANT de libérer la préparation réseau.
				if (change === 'revoke') await bands.removeMember(f.membership.id, f.owner, now);
				if (change === 'delete') await works.deleteWork(f.work.id, f.owner);
				if (change === 'dissolve')
					await transaction(async (tx) => {
						await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`band:${f.band.id}`}))`;
						await tx.organization.update({
							where: { actorId: f.band.id },
							data: { dissolvedAt: now }
						});
					});
			} finally {
				release.release();
			}
			expect(await result).toMatchObject({ status: change === 'revoke' ? 403 : 404 });
			expect(await db.media.count({ where: { actorId: f.band.id } })).toBe(1);
			expect(
				await db.domainEvent.count({
					where: { actorIds: { has: f.band.id }, type: 'media.published' }
				})
			).toBe(0);
			spy.mockRestore();
		});
	}
	it('lien neuf : association et publication atomiques ; idée privée, sans XP', async () => {
		const f = await fixture('new-link');
		await mutations.link(f, f.admin);
		const work = await db.work.findUniqueOrThrow({ where: { id: f.work.id } });
		expect(work.demoFromWork).toBe(true);
		expect(work.demoMediaId).not.toBe(f.media.id);
		expect(await getPublishedMedia(work.demoMediaId!)).toBeNull();
		expect(await works.workPage(work.id, f.owner)).toMatchObject({ demo: { status: 'PUBLISHED' } });
		expect(
			await db.domainEvent.count({
				where: {
					type: 'media.published',
					payload: { path: ['mediaId'], equals: work.demoMediaId! }
				}
			})
		).toBe(1);
		expect(await db.xpTransaction.count({ where: { actorId: f.band.id } })).toBe(0);
		expect(await getPublishedMedia(f.media.id)).not.toBeNull();
	});
	it('création refusée après dissolution validée sous band ; aucun crédit ni acte', async () => {
		const f = await fixture('create-dissolved');
		const held = barrier(),
			release = barrier(),
			waiting = barrier();
		const dissolving = transaction(async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`band:${f.band.id}`}))`;
			held.release();
			await release.promise;
			await tx.organization.update({ where: { actorId: f.band.id }, data: { dissolvedAt: now } });
		});
		await reached(held.promise);
		observeNext(async (key, run) => {
			if (key === `band:${f.band.id}`) waiting.release();
			return run();
		});
		const before = await state(f);
		const result = works
			.createWork(f.admin, { title: 'Refusé', band: f.band.handle, genreIds: [], roles: [role] })
			.then(
				() => null,
				(error) => error
			);
		try {
			await reached(waiting.promise);
		} finally {
			release.release();
		}
		await dissolving;
		expect(await result).toMatchObject({ status: 403 });
		expect(await state(f)).toEqual(before);
	});
	it('création avec échec du journal : rollback Work, rôles et crédit', async () => {
		const f = await fixture('create-rollback');
		const before = await state(f);
		observeNext(async (_key, run) => run(), true);
		await expect(
			works.createWork(f.admin, {
				title: 'Rollback',
				band: f.band.handle,
				genreIds: [],
				roles: [role]
			})
		).rejects.toThrow('acte refusé');
		expect(await state(f)).toEqual(before);
	});
});
