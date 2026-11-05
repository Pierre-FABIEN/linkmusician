/**
 * Appréciations après une collaboration (P2-07) sur la base de `.env`,
 * schéma `e2e` : impossible sans collaboration commune confirmée ; la
 * reprise reprend l'XP (transaction négative liée) et retire l'endosseur
 * du palier ; redonnée, elle suit les rendements décroissants de la paire.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/collaborations
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const url = new URL(
	dotenv.config({ quiet: true }).parsed?.DATABASE_URL ??
		process.env.DATABASE_URL ??
		'postgresql://x/y'
);
url.searchParams.set('schema', 'e2e');
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });

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
});
