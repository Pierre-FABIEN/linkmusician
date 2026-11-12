/**
 * Collaborations et rendements décroissants (P2-06), sur le schéma `e2e` :
 * entre deux membres de confiance (poids 1), la k-ième collaboration en
 * 12 mois rapporte 400, 200, 100, puis 0 ; avec un nouveau compte (TL0),
 * le poids de confiance réduit le gain (×0,1). Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/progression/collaborations
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';
import { emitAndProcess } from './processor';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const PREFIX = 'collab-test-';

describe.skipIf(!enabled)('collaborations : multiplicateurs (schéma e2e)', () => {
	let db: PrismaClient;
	const ids: Record<string, string> = {};

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: { handle: { startsWith: PREFIX } },
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		if (list.length === 0) return;
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
	}

	beforeAll(async () => {
		const url = new URL(
			dotenv.config({ quiet: true }).parsed?.DATABASE_URL ?? process.env.DATABASE_URL ?? ''
		);
		url.searchParams.set('schema', 'e2e');
		db = createPrismaClient(url.toString());
		await cleanup();
		for (const [name, trustLevel] of [
			['lea', 2],
			['malik', 2],
			['nouveau', 0]
		] as const) {
			ids[name] = (
				await db.actor.create({
					data: { kind: 'PERSON', handle: PREFIX + name, displayName: name, trustLevel }
				})
			).id;
		}
	}, 60_000);

	afterAll(async () => {
		await cleanup();
		await db?.$disconnect();
	});

	const collaborate = (a: string, b: string, n: number) =>
		db.$transaction(
			(tx) =>
				emitAndProcess(tx, {
					type: 'collaboration.completed',
					collaborationId: `${PREFIX}${a}-${b}-${n}`,
					participantIds: [ids[a], ids[b]]
				}),
			{ timeout: 30_000 }
		);

	const gains = async (actor: string) =>
		(
			await db.xpTransaction.findMany({
				where: { actorId: ids[actor], ruleId: 'collaboration.completed' },
				orderBy: { createdAt: 'asc' },
				select: { amount: true }
			})
		).map((g) => g.amount);

	it('400, 200, 100 puis 0 avec la même personne', async () => {
		for (let n = 1; n <= 4; n++) await collaborate('lea', 'malik', n);
		// La 4ᵉ ne rapporte rien : aucune ligne n'est écrite pour un gain nul.
		expect(await gains('lea')).toEqual([400, 200, 100]);
		expect(await gains('malik')).toEqual([400, 200, 100]);
	});

	it('avec un nouveau compte, le poids de confiance réduit le gain', async () => {
		await collaborate('lea', 'nouveau', 1);
		const lea = await gains('lea');
		expect(lea.at(-1)).toBe(40); // 400 × 1 × 0,1 (TL0)
		expect(await gains('nouveau')).toEqual([400]); // Léa est de confiance (TL2)
	});
});
