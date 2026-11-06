/**
 * Réputation (P2-08), sur la base de `.env`, schéma `e2e`. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/progression
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { emitAndProcess } from './processor';
import { getPublicReputation, recomputeReputation } from './reputation';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const PREFIX = 'reputation-test-';

describe.skipIf(!enabled)('réputation (schéma e2e)', () => {
	let db: PrismaClient;
	let lea = '';
	let max = '';

	const tx = <T>(
		fn: (t: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]) => Promise<T>
	) => db.$transaction(fn, { timeout: 30_000, maxWait: 30_000 });

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: { handle: { startsWith: PREFIX } },
			select: { id: true }
		});
		const ids = actors.map((a) => a.id);
		await db.actor.deleteMany({ where: { id: { in: ids } } });
		if (ids.length) await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: ids } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	async function person(name: string) {
		const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
		const user = await db.user.create({
			data: {
				email: `${PREFIX}${name}-${stamp}@example.test`,
				emailVerified: true,
				referralCode: `R${stamp}`.slice(0, 12)
			}
		});
		const actor = await db.actor.create({
			data: { kind: 'PERSON', handle: `${PREFIX}${name}`, displayName: name }
		});
		await db.person.create({
			data: {
				actorId: actor.id,
				userId: user.id,
				birthDate: new Date('1990-01-01'),
				termsAcceptedAt: new Date()
			}
		});
		return actor.id;
	}

	const score = async (actorId: string) =>
		(await db.reputationSnapshot.findUniqueOrThrow({ where: { actorId } })).internalScore;

	beforeAll(async () => {
		const url = new URL(
			dotenv.config({ quiet: true }).parsed?.DATABASE_URL ?? process.env.DATABASE_URL ?? ''
		);
		url.searchParams.set('schema', 'e2e');
		db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
		await cleanup();
		lea = await person('lea');
		max = await person('max');
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db?.$disconnect();
	}, 120_000);

	it('la carte se calcule à la demande, vide pour un compte neuf', async () => {
		const card = await getPublicReputation(lea, db);
		expect(card).toMatchObject({ confirmedCollabs: 0, responseBucket: null });
		expect(card).not.toHaveProperty('internalScore');
		expect(await score(lea)).toBe(0);
	}, 120_000);

	it('une collaboration confirmée remplit la carte des deux', async () => {
		await tx((t) =>
			emitAndProcess(t, {
				type: 'collaboration.completed',
				collaborationId: `${PREFIX}c1`,
				participantIds: [lea, max]
			})
		);
		for (const id of [lea, max]) {
			expect(await getPublicReputation(id, db)).toMatchObject({
				confirmedCollabs: 1,
				distinctCounterparts: 1
			});
			expect(await score(id)).toBeGreaterThan(0);
		}
	}, 120_000);

	it('l’XP n’entre pas dans le calcul', async () => {
		const before = await score(lea);
		const source = await db.domainEvent.findFirstOrThrow({
			where: { type: 'collaboration.completed', actorIds: { has: lea } }
		});
		await db.xpTransaction.create({
			data: {
				actorId: lea,
				track: 'ACCOUNT',
				amount: 1_000_000,
				ruleId: `${PREFIX}rule`,
				ruleVersion: 1,
				multiplier: 1,
				reason: 'test',
				sourceEventId: source.id
			}
		});
		await db.actorProgress.upsert({
			where: { actorId_track: { actorId: lea, track: 'ACCOUNT' } },
			create: { actorId: lea, track: 'ACCOUNT', xp: 1_000_000, level: 99 },
			update: { xp: 1_000_000, level: 99 }
		});
		await tx((t) => recomputeReputation(t, [lea]));
		expect(await score(lea)).toBe(before);
	}, 120_000);
});
