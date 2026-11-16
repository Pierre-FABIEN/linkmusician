/** ARCH-MET-02c : vraies transactions PostgreSQL, barrières et schéma e2e. */
import type { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import dotenv from 'dotenv';
import { createPrismaClient } from '../../../../prisma/client.js';

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
const service = await import('./service');
const prefix = `proposal-${Date.now()}-`;
const ids: string[] = [],
	users: string[] = [];
let conversationId: string, otherConversationId: string, workId: string;
const now = new Date('2026-11-16T12:00:00Z');
const transaction = db.$transaction.bind(db);

function barrier() {
	let release!: () => void;
	const promise = new Promise<void>((resolve) => {
		release = resolve;
	});
	return { promise, release };
}
async function reached(promise: Promise<unknown>) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error('barrière non atteinte')), 15000);
			})
		]);
	} finally {
		clearTimeout(timer);
	}
}

type Hooks = {
	entered?: () => Promise<void>;
	lock?: (key: string) => void;
	create?: () => Promise<void>;
	update?: () => Promise<void>;
	participant?: () => Promise<void>;
	fail?: 'notification' | 'participant';
};
/** Instrumente le vrai TransactionClient, sans remplacer count, verrous ou moteur. */
function observeNext(hooks: Hooks) {
	const spy = vi.spyOn(db, '$transaction');
	spy.mockImplementationOnce((async (
		callback: (tx: Prisma.TransactionClient) => Promise<unknown>
	) => {
		spy.mockRestore();
		return transaction(
			async (tx) => {
				await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '10s'");
				await hooks.entered?.();
				return callback(
					new Proxy(tx, {
						get(target, property) {
							if (property === '$executeRaw')
								return (...args: Parameters<Prisma.TransactionClient['$executeRaw']>) => {
									const running = Promise.resolve(target.$executeRaw(...args));
									hooks.lock?.(String(args[1]));
									return running;
								};
							if (property === 'collaboration')
								return new Proxy(target.collaboration, {
									get(delegate, method) {
										if (method === 'create')
											return async (...args: Parameters<typeof delegate.create>) => {
												await hooks.create?.();
												const result = await delegate.create(...args);
												if (hooks.fail === 'participant') {
													// Une vraie erreur SQL après les participants imbriqués : rollback total.
													await tx.collaborationParticipant.create({
														data: { collaborationId: String(result.id), actorId: ids[0] }
													});
												}
												return result;
											};
										if (method === 'update')
											return async (...args: Parameters<typeof delegate.update>) => {
												await hooks.update?.();
												return delegate.update(...args);
											};
										return Reflect.get(delegate, method);
									}
								});
							if (property === 'collaborationParticipant')
								return new Proxy(target.collaborationParticipant, {
									get(delegate, method) {
										if (method === 'update')
											return async (...args: Parameters<typeof delegate.update>) => {
												await hooks.participant?.();
												return delegate.update(...args);
											};
										return Reflect.get(delegate, method);
									}
								});
							if (property === 'notification' && hooks.fail === 'notification')
								return new Proxy(target.notification, {
									get(delegate, method) {
										if (method === 'create')
											return async (...args: Parameters<typeof delegate.create>) => {
												await delegate.create(...args);
												throw new Error('notification interrompue après écriture');
											};
										return Reflect.get(delegate, method);
									}
								});
							const value = Reflect.get(target, property);
							return typeof value === 'function' ? value.bind(target) : value;
						}
					})
				);
			},
			{ timeout: 30000 }
		);
	}) as typeof db.$transaction);
	return spy;
}
const propose = (
	day: string,
	actor = ids[0],
	kind: 'REHEARSAL' | 'SESSION_WORK' | 'RECORDING' = 'REHEARSAL',
	conversation = conversationId
) =>
	service.proposeCollaboration(
		actor,
		conversation,
		{
			kind,
			title: `${prefix}${day}`,
			happenedOn: day,
			...(kind === 'RECORDING'
				? { work: workId, provider: actor === ids[0] ? ('other' as const) : ('me' as const) }
				: {})
		},
		now
	);
const rows = (day: string, conversation = conversationId) =>
	db.collaboration.findMany({
		where: { conversationId: conversation, happenedOn: new Date(`${day}T00:00:00Z`) },
		include: { participants: true }
	});
const notifications = (day: string) =>
	db.notification.count({ where: { title: `${prefix}${day}`, type: 'COLLAB_TO_CONFIRM' } });

/** Observe PostgreSQL lui-même : le second tx attend réellement le premier. */
async function waitingForLock(key: string) {
	await reached(
		(async () => {
			for (let attempt = 0; attempt < 150; attempt++) {
				const [row] = await db.$queryRaw<{ waiting: boolean }[]>`
				SELECT EXISTS (SELECT 1 FROM pg_locks
				WHERE locktype = 'advisory' AND NOT granted
				AND objid = (hashtext(${key})::bigint & 4294967295)::oid) AS waiting`;
				if (row.waiting) return;
				await new Promise((resolve) => setTimeout(resolve, 20));
			}
			throw new Error('aucune attente PostgreSQL observée');
		})()
	);
}

/** Le premier tx est suspendu avant INSERT. L'ancien code laisse le second
 * finir ; le code corrigé le met en attente dans PostgreSQL avant sa relecture. */
async function race(
	day: string,
	actor = ids[0],
	kind: 'REHEARSAL' | 'SESSION_WORK' | 'RECORDING' = 'REHEARSAL',
	secondKind = kind
) {
	const held = barrier(),
		release = barrier(),
		locking = barrier();
	let key = '';
	observeNext({
		create: async () => {
			held.release();
			await release.promise;
		}
	});
	const first = propose(day, ids[0], kind);
	let second: ReturnType<typeof propose> | undefined;
	try {
		await reached(held.promise);
		observeNext({
			lock: (value) => {
				key = value;
				locking.release();
			}
		});
		second = propose(day, actor, secondKind);
		const results = Promise.allSettled([first, second]);
		const phase = await reached(
			Promise.race([
				locking.promise.then(() => 'lock'),
				second.then(
					() => 'finished',
					() => 'finished'
				)
			])
		);
		if (phase === 'lock') await waitingForLock(key);
		release.release();
		return await results;
	} finally {
		release.release();
		await Promise.allSettled([first, ...(second ? [second] : [])]);
		vi.restoreAllMocks();
	}
}
function expectSingle(results: Awaited<ReturnType<typeof race>>) {
	expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
	const rejected = results.find((r) => r.status === 'rejected');
	expect(rejected?.reason).toBeInstanceOf(service.CollaborationError);
	expect(rejected?.reason.message).toBe('Une collaboration existe déjà pour ce jour.');
}

describe.skipIf(!enabled)('propositions concurrentes (e2e)', { timeout: 60000 }, () => {
	beforeAll(async () => {
		for (let i = 0; i < 3; i++) {
			const user = await db.user.create({
				data: { email: `${prefix}${i}@example.test`, referralCode: `${prefix}${i}` }
			});
			users.push(user.id);
			const actor = await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: `${prefix}${i}`,
					displayName: `Personne ${i}`,
					trustLevel: 2,
					person: {
						create: {
							userId: user.id,
							termsAcceptedAt: now,
							birthDate: new Date('1990-01-01'),
							tracks: {
								create: { track: i === 1 ? 'SOUND_ENGINEER' : 'MUSICIAN', isPrimary: true }
							}
						}
					}
				}
			});
			ids.push(actor.id);
		}
		for (const other of [ids[1], ids[2]]) {
			const conversation = await db.conversation.create({
				data: {
					pairKey: [ids[0], other].sort().join(':'),
					initiatorId: ids[0],
					participants: {
						create: [
							{ actorId: ids[0], state: 'ACCEPTED' },
							{ actorId: other, state: 'ACCEPTED' }
						]
					}
				}
			});
			if (other === ids[1]) conversationId = conversation.id;
			else otherConversationId = conversation.id;
		}
		workId = (
			await db.work.create({
				data: {
					title: prefix,
					ownerId: ids[0],
					createdById: ids[0],
					state: 'COMPOSED',
					composedAt: now
				}
			})
		).id;
	});
	afterAll(async () => {
		vi.restoreAllMocks();
		await db.collaboration.deleteMany({ where: { proposedById: { in: ids } } });
		await db.conversation.deleteMany({ where: { initiatorId: { in: ids } } });
		await db.actor.deleteMany({ where: { id: { in: ids } } });
		await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: ids } } });
		await db.user.deleteMany({ where: { id: { in: users } } });
		await db.$disconnect();
	});

	it('R3 : deux propositions simultanées, une collaboration et une notification', async () => {
		const results = await race('2026-10-01');
		const kept = await rows('2026-10-01');
		expect.soft(kept).toHaveLength(1);
		expect(kept[0].participants).toHaveLength(2);
		expect.soft(await notifications('2026-10-01')).toBe(1);
		expectSingle(results);
	});
	it.each([
		['deux proposants', 1, 'REHEARSAL'],
		['deux types', 0, 'SESSION_WORK'],
		['deux proposants et types', 1, 'SESSION_WORK']
	] as const)('la clé est commune : %s', async (_, proposer, kind) => {
		const day = `2026-09-${String(1 + proposer + (kind === 'SESSION_WORK' ? 2 : 0)).padStart(2, '0')}`;
		expectSingle(await race(day, ids[proposer], 'REHEARSAL', kind));
		expect(await rows(day)).toHaveLength(1);
		expect(await notifications(day)).toBe(1);
	});
	it.each(['date', 'conversation'] as const)(
		'deux clés distinctes restent indépendantes : %s',
		async (difference) => {
			const day = difference === 'date' ? '2026-10-03' : '2026-10-05';
			const held = barrier(),
				release = barrier();
			observeNext({
				create: async () => {
					held.release();
					await release.promise;
				}
			});
			const first = propose(day);
			try {
				await reached(held.promise);
				// Doit terminer alors que le premier tx reste suspendu.
				await reached(
					propose(
						difference === 'date' ? '2026-10-04' : day,
						ids[0],
						'REHEARSAL',
						difference === 'conversation' ? otherConversationId : conversationId
					)
				);
			} finally {
				release.release();
				await first;
			}
			expect(await rows(day)).toHaveLength(1);
		}
	);
	it.each(['PROPOSED', 'ACCEPTED', 'COMPLETED'] as const)(
		'%s refuse un nouvel objet sans effet',
		async (status) => {
			const day = { PROPOSED: '2026-12-01', ACCEPTED: '2026-12-02', COMPLETED: '2026-10-06' }[
				status
			];
			const { id } = await propose(day);
			if (status !== 'PROPOSED') await service.respondToCollaboration(ids[1], id, true, now);
			const before = await rows(day);
			await expect(propose(day, ids[1], 'SESSION_WORK')).rejects.toBeInstanceOf(
				service.CollaborationError
			);
			expect(await rows(day)).toEqual(before);
			expect(before[0].status).toBe(status);
			expect(await notifications(day)).toBe(1);
		}
	);
	it.each(['annulation', 'refus'] as const)(
		'%s puis nouvelle ligne : anciens actes et consentements conservés',
		async (action) => {
			const day = action === 'annulation' ? '2026-10-07' : '2026-10-08';
			const { id } = await propose(day);
			if (action === 'annulation') await service.cancelCollaboration(ids[0], id, now);
			else await service.respondToCollaboration(ids[1], id, false, now);
			const [old] = await rows(day);
			const fresh = await propose(day, ids[1], 'SESSION_WORK');
			expect(fresh.id).not.toBe(id);
			const both = await rows(day);
			expect(both).toHaveLength(2);
			expect(both.find((r) => r.id === id)).toEqual(old);
			expect(
				both.find((r) => r.id === fresh.id)?.participants.find((p) => p.actorId === ids[0])
					?.acceptedAt
			).toBeNull();
		}
	);
	it('annulation non validée : refus prudent, puis nouvel essai après commit', async () => {
		const day = '2026-10-09';
		const { id } = await propose(day);
		const held = barrier(),
			release = barrier();
		observeNext({
			update: async () => {
				held.release();
				await release.promise;
			}
		});
		const cancellation = service.cancelCollaboration(ids[0], id, now);
		try {
			await reached(held.promise);
			await expect(propose(day, ids[1])).rejects.toBeInstanceOf(service.CollaborationError);
		} finally {
			release.release();
			await cancellation;
		}
		await propose(day, ids[1]);
		expect((await rows(day)).map((r) => r.status).sort()).toEqual(['CANCELLED', 'PROPOSED']);
		expect(await notifications(day)).toBe(2);
	});
	it('annulation validée pendant l’attente de proposition : la relecture autorise une nouvelle ligne', async () => {
		const day = '2026-10-13';
		const key = `collaboration-proposal:${conversationId}:${day}`;
		const entered = barrier(),
			start = barrier(),
			held = barrier(),
			release = barrier(),
			locking = barrier();
		// Le contrôle précoce voit zéro ; suspendre avant la section critique.
		observeNext({
			entered: async () => {
				entered.release();
				await start.promise;
			},
			lock: () => locking.release()
		});
		const pending = propose(day, ids[1]);
		let holder: Promise<unknown> | undefined;
		try {
			await reached(entered.promise);
			const old = await propose(day);
			holder = transaction(
				async (tx) => {
					await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
					held.release();
					await release.promise;
				},
				{ timeout: 30000 }
			);
			await reached(held.promise);
			start.release();
			await reached(locking.promise);
			await waitingForLock(key);
			await reached(service.cancelCollaboration(ids[0], old.id, now));
			release.release();
			await holder;
			const fresh = await pending;
			expect(fresh.id).not.toBe(old.id);
		} finally {
			start.release();
			release.release();
			await Promise.allSettled([pending, ...(holder ? [holder] : [])]);
		}
		expect((await rows(day)).map((r) => r.status).sort()).toEqual(['CANCELLED', 'PROPOSED']);
		expect(await notifications(day)).toBe(2);
	});
	it('après annulation, deux nouveaux essais ne créent qu’une ligne effective', async () => {
		const day = '2026-10-14';
		const old = await propose(day);
		await service.cancelCollaboration(ids[0], old.id, now);
		const before = (await rows(day))[0];
		expectSingle(await race(day, ids[1]));
		const both = await rows(day);
		expect(both).toHaveLength(2);
		expect(both.filter((r) => r.status !== 'CANCELLED')).toHaveLength(1);
		expect(both.find((r) => r.id === old.id)).toEqual(before);
		expect(await notifications(day)).toBe(2);
	});
	it.each(['notification', 'participant'] as const)(
		'échec %s : rollback complet et nouvel essai',
		async (fail) => {
			const day = fail === 'notification' ? '2026-10-10' : '2026-10-11';
			const participants = await db.collaborationParticipant.count({
				where: { actorId: { in: ids } }
			});
			observeNext({ fail });
			await expect(propose(day)).rejects.toThrow();
			expect(await rows(day)).toHaveLength(0);
			expect(await notifications(day)).toBe(0);
			expect(await db.collaborationParticipant.count({ where: { actorId: { in: ids } } })).toBe(
				participants
			);
			await propose(day);
			expect(await rows(day)).toHaveLength(1);
			expect(await notifications(day)).toBe(1);
		}
	);
	it('la proposition conservée ne produit qu’une finalisation, un crédit et ses actes', async () => {
		const day = '2026-10-12';
		expectSingle(await race(day, ids[1], 'RECORDING'));
		const [kept] = await rows(day);
		const held = barrier(),
			release = barrier(),
			entered = barrier();
		observeNext({
			participant: async () => {
				held.release();
				await release.promise;
			}
		});
		const first = service.respondToCollaboration(ids[1], kept.id, true, now);
		let second: ReturnType<typeof service.respondToCollaboration> | undefined;
		try {
			await reached(held.promise);
			observeNext({ lock: entered.release });
			second = service.respondToCollaboration(ids[1], kept.id, true, now);
			const results = Promise.allSettled([first, second]);
			await reached(entered.promise);
			await waitingForLock(`collaboration:${kept.id}`);
			release.release();
			const settled = await results;
			expect(settled.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
			expect(settled.find((r) => r.status === 'rejected')?.reason).toBeInstanceOf(
				service.CollaborationError
			);
		} finally {
			release.release();
			await Promise.allSettled([first, ...(second ? [second] : [])]);
		}
		const events = await db.domainEvent.findMany({
			where: {
				type: 'collaboration.completed',
				payload: { path: ['collaborationId'], equals: kept.id }
			}
		});
		expect(events).toHaveLength(1);
		const gains = await db.xpTransaction.findMany({ where: { sourceEventId: events[0].id } });
		expect(gains).toHaveLength(2);
		expect(new Set(gains.map((g) => `${g.actorId}:${g.track}:${g.ruleId}`)).size).toBe(2);
		expect(
			await db.workContributor.count({
				where: { workId, personId: ids[1], confirmedAt: { not: null } }
			})
		).toBe(1);
		// Le crédit automatique ne reconstitue aucun acte humain.
		expect(await db.workCreditAct.count({ where: { workId } })).toBe(0);
		expect(
			(await rows(day))[0].participants.every((p) => p.acceptedAt && p.confirmedCompletionAt)
		).toBe(true);
		expect(await notifications(day)).toBe(1);
	});
});
