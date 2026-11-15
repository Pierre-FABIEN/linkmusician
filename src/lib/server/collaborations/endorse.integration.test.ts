/**
 * Appréciations après une collaboration (P2-07) sur la base de `.env`,
 * schéma `e2e` : impossible sans collaboration commune confirmée ; la
 * reprise reprend l'XP (transaction négative liée) et retire l'endosseur
 * du palier ; redonnée, elle suit les rendements décroissants de la paire.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/collaborations
 */
import type { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';

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

const { endorseCollaborator, revokeCollabEndorsement } = await import('./endorse');
const { getMusicianTier } = await import('../progression/read');

const PREFIX = 'cendo-test-';

describe.skipIf(!enabled)('appréciations après une collaboration (schéma e2e)', () => {
	const ids: Record<string, string> = {};
	let done = '';
	let pending = '';

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: { handle: { startsWith: PREFIX } },
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		if (list.length === 0) return;
		await db.collaboration.deleteMany({ where: { proposedById: { in: list } } });
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
	}

	const collab = (status: 'COMPLETED' | 'ACCEPTED') =>
		db.collaboration.create({
			data: {
				kind: 'REHEARSAL',
				status,
				title: 'Répète',
				happenedOn: new Date('2026-10-01'),
				proposedById: ids.lea,
				completedAt: status === 'COMPLETED' ? new Date() : null,
				participants: { create: [{ actorId: ids.lea }, { actorId: ids.malik }] }
			},
			select: { id: true }
		});

	// La confiance est recalculée après chaque événement : on la remet (TL1).
	const trusted = () =>
		db.actor.updateMany({ where: { id: { in: Object.values(ids) } }, data: { trustLevel: 1 } });

	const xp = async (actor: string) =>
		(
			await db.xpTransaction.aggregate({
				where: { actorId: ids[actor], ruleId: { startsWith: 'endorsement.received' } },
				_sum: { amount: true }
			})
		)._sum.amount ?? 0;

	beforeAll(async () => {
		await cleanup();
		for (const name of ['lea', 'malik', 'zoe']) {
			ids[name] = (
				await db.actor.create({
					data: { kind: 'PERSON', handle: PREFIX + name, displayName: name, trustLevel: 1 }
				})
			).id;
		}
		done = (await collab('COMPLETED')).id;
		pending = (await collab('ACCEPTED')).id;
	}, 60_000);

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	const form = (collaborationId: string, to: string) => ({
		collaborationId,
		to: PREFIX + to,
		quality: 'RELIABLE' as const
	});

	it('impossible sans collaboration commune confirmée', async () => {
		await trusted();
		// Zoé n'y était pas : ni pour apprécier, ni pour être appréciée.
		await expect(endorseCollaborator(ids.zoe, form(done, 'malik'))).rejects.toThrow(/introuvable/);
		await expect(endorseCollaborator(ids.lea, form(done, 'zoe'))).rejects.toThrow(/collaboré/);
		await expect(endorseCollaborator(ids.lea, form(pending, 'malik'))).rejects.toThrow(/confirmée/);
		expect(await xp('malik')).toBe(0);
	});

	it('TL1 requise', async () => {
		await db.actor.update({ where: { id: ids.lea }, data: { trustLevel: 0 } });
		await expect(endorseCollaborator(ids.lea, form(done, 'malik'))).rejects.toThrow(/confiance 1/);
	});

	it('rapporte, ne se donne qu’une fois, et sa reprise reprend l’XP', async () => {
		await trusted();
		await endorseCollaborator(ids.lea, form(done, 'malik'));
		expect(await xp('malik')).toBe(40);
		expect((await getMusicianTier(ids.malik, db)).summary.distinctEndorsers).toBe(1);

		await trusted();
		await expect(endorseCollaborator(ids.lea, form(done, 'malik'))).rejects.toThrow(/déjà/);

		await revokeCollabEndorsement(ids.lea, done, PREFIX + 'malik');
		expect(await xp('malik')).toBe(0);
		const reversal = await db.xpTransaction.findFirst({
			where: { actorId: ids.malik, amount: -40 },
			select: { reversesId: true }
		});
		expect(reversal?.reversesId).toBeTruthy();
		expect((await getMusicianTier(ids.malik, db)).summary.distinctEndorsers).toBe(0);
	});

	it('redonnée, elle suit les rendements décroissants de la paire', async () => {
		await trusted();
		await endorseCollaborator(ids.lea, form(done, 'malik'));
		expect(await xp('malik')).toBe(20);
		expect((await getMusicianTier(ids.malik, db)).summary.distinctEndorsers).toBe(1);
	});
	it('conserve chaque transition concurrente réelle sans multiplier notifications ni moteur', async () => {
		const c = (await collab('COMPLETED')).id;
		const acts = () =>
			db.collaborationAppreciationAct.findMany({
				where: { collaborationId: c },
				orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }]
			});
		const now = new Date('2026-11-15T14:00:00Z');
		const notifications = () => db.notification.count({ where: { recipientActorId: ids.malik } });
		const before = await notifications();
		const xpBefore = await xp('malik');
		const received = () =>
			db.domainEvent.count({
				where: { type: 'endorsement.received', actorIds: { has: ids.malik } }
			});
		const revokedEvents = () =>
			db.domainEvent.count({
				where: { type: 'endorsement.revoked', actorIds: { has: ids.malik } }
			});
		const receivedBefore = await received();
		const revokedBefore = await revokedEvents();
		for (let cycle = 0; cycle < 3; cycle++) {
			await trusted();
			const given = await Promise.allSettled([
				endorseCollaborator(ids.lea, form(c, 'malik'), now),
				endorseCollaborator(ids.lea, { ...form(c, 'malik'), quality: 'ON_TIME' }, now)
			]);
			expect(given.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
			const active = await db.collabEndorsement.findFirstOrThrow({ where: { collaborationId: c } });
			await expect(endorseCollaborator(ids.lea, form(c, 'malik'), now)).rejects.toThrow();
			expect(await db.collabEndorsement.findUnique({ where: { id: active.id } })).toEqual(active);
			const revoked = await Promise.allSettled([
				revokeCollabEndorsement(ids.lea, c, PREFIX + 'malik', now),
				revokeCollabEndorsement(ids.lea, c, PREFIX + 'malik', now)
			]);
			expect(revoked.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
			expect(await acts()).toHaveLength((cycle + 1) * 2);
			expect(await xp('malik')).toBe(xpBefore);
		}
		const kept = await acts();
		expect(kept.filter((a) => a.kind === 'GIVEN')).toHaveLength(3);
		expect(
			kept.every((a) => a.authorId === ids.lea && a.occurredAt.getTime() === now.getTime())
		).toBe(true);
		expect(new Set(kept.map((a) => a.id)).size).toBe(6);
		expect(await notifications()).toBe(before + 3);
		expect(await received()).toBe(receivedBefore + 3);
		expect(await revokedEvents()).toBe(revokedBefore + 3);
		expect(await db.collabEndorsement.count({ where: { collaborationId: c } })).toBe(1);
	}, 60_000);

	it('sérialise attribution et reprise opposées', async () => {
		const c = (await collab('COMPLETED')).id;
		await trusted();
		const results = await Promise.allSettled([
			endorseCollaborator(ids.lea, form(c, 'malik')),
			revokeCollabEndorsement(ids.lea, c, PREFIX + 'malik')
		]);
		expect(results[0].status).toBe('fulfilled');
		const row = await db.collabEndorsement.findFirstOrThrow({ where: { collaborationId: c } });
		const acts = await db.collaborationAppreciationAct.findMany({ where: { collaborationId: c } });
		expect(acts).toHaveLength(row.revokedAt ? 2 : 1);
	}, 60_000);

	it('garde le blocage et les droits, mais permet de reprendre après blocage', async () => {
		const c = (await collab('COMPLETED')).id;
		await trusted();
		await endorseCollaborator(ids.lea, form(c, 'malik'));
		await db.block.create({ data: { blockerActorId: ids.malik, blockedActorId: ids.lea } });
		try {
			await expect(revokeCollabEndorsement(ids.zoe, c, PREFIX + 'malik')).rejects.toThrow();
			await revokeCollabEndorsement(ids.lea, c, PREFIX + 'malik');
			await trusted();
			await expect(endorseCollaborator(ids.lea, form(c, 'malik'))).rejects.toThrow(/collaboré/);
			expect(await db.collaborationAppreciationAct.count({ where: { collaborationId: c } })).toBe(
				2
			);
		} finally {
			await db.block.deleteMany({ where: { blockerActorId: ids.malik } });
		}
		await db.actor.update({ where: { id: ids.lea }, data: { deletedAt: new Date() } });
		try {
			await expect(endorseCollaborator(ids.lea, form(c, 'malik'))).rejects.toThrow(/introuvable/);
		} finally {
			await db.actor.update({ where: { id: ids.lea }, data: { deletedAt: null } });
		}
	}, 60_000);

	it('annule mutation, moteur et notification si l’écriture du registre échoue', async () => {
		const c = (await collab('COMPLETED')).id;
		for (const revoke of [false, true]) {
			await trusted();
			if (revoke) await endorseCollaborator(ids.lea, form(c, 'malik'));
			const rows = await db.collabEndorsement.findMany({ where: { collaborationId: c } });
			const events = await db.domainEvent.count({ where: { actorIds: { has: ids.malik } } });
			const notifications = await db.notification.count({ where: { recipientActorId: ids.malik } });
			const gains = await xp('malik');
			const transaction = db.$transaction.bind(db);
			const spy = vi.spyOn(db, '$transaction');
			spy.mockImplementationOnce((async (
				callback: (tx: Prisma.TransactionClient) => Promise<unknown>
			) =>
				transaction(
					async (tx) =>
						callback(
							new Proxy(tx, {
								get(target, key) {
									if (key === 'collaborationAppreciationAct')
										return new Proxy(target.collaborationAppreciationAct, {
											get(model, method) {
												if (method === 'create')
													return () => {
														throw new Error('trace simulée');
													};
												return Reflect.get(model, method);
											}
										});
									return Reflect.get(target, key);
								}
							})
						),
					{ timeout: 30_000 }
				)) as unknown as typeof db.$transaction);
			try {
				await expect(
					revoke
						? revokeCollabEndorsement(ids.lea, c, PREFIX + 'malik')
						: endorseCollaborator(ids.lea, form(c, 'malik'))
				).rejects.toThrow(/trace simulée/);
			} finally {
				spy.mockRestore();
			}
			expect(await db.collabEndorsement.findMany({ where: { collaborationId: c } })).toEqual(rows);
			expect(await db.domainEvent.count({ where: { actorIds: { has: ids.malik } } })).toBe(events);
			expect(await db.notification.count({ where: { recipientActorId: ids.malik } })).toBe(
				notifications
			);
			expect(await xp('malik')).toBe(gains);
		}
	}, 60_000);
	it('une ancienne ligne ne devient pas un ancien acte ; sa nouvelle reprise est conservée', async () => {
		const c = (await collab('COMPLETED')).id;
		await db.collabEndorsement.create({
			data: { collaborationId: c, fromActorId: ids.lea, toActorId: ids.malik, quality: 'RELIABLE' }
		});
		expect(await db.collaborationAppreciationAct.count({ where: { collaborationId: c } })).toBe(0);
		await revokeCollabEndorsement(ids.lea, c, PREFIX + 'malik');
		expect(
			await db.collaborationAppreciationAct.findMany({ where: { collaborationId: c } })
		).toEqual([expect.objectContaining({ kind: 'REVOKED', authorId: ids.lea })]);
		await db.collaboration.delete({ where: { id: c } });
		expect(await db.collaborationAppreciationAct.count({ where: { collaborationId: c } })).toBe(0);
	});
	it('la suppression physique de l’auteur cascade seulement ses actes', async () => {
		const c = (await collab('COMPLETED')).id;
		const author = await db.actor.create({
			data: { kind: 'PERSON', handle: PREFIX + 'physical', displayName: 'Fixture physique' }
		});
		await db.collaborationAppreciationAct.create({
			data: { collaborationId: c, authorId: author.id, kind: 'GIVEN', occurredAt: new Date() }
		});
		await db.actor.delete({ where: { id: author.id } });
		expect(await db.collaborationAppreciationAct.count({ where: { collaborationId: c } })).toBe(0);
		expect(await db.collaboration.count({ where: { id: c } })).toBe(1);
	});
});
