/**
 * Confiance (P1-09), sur la base de `.env`, schéma `e2e`. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/progression
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { emitAndProcess } from './processor';
import { recomputeTrust, trustSummaryFor } from './trust';

const enabled = process.env.PROGRESSION_INTEGRATION === '1';
const PREFIX = 'trust-test-';
const DAY = 86_400_000;

describe.skipIf(!enabled)('confiance (schéma e2e)', () => {
	let db: PrismaClient;
	let lea = '';
	let max = '';
	const users: string[] = [];

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

	async function person(name: string, ageDays: number) {
		const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
		const user = await db.user.create({
			data: {
				email: `${PREFIX}${name}-${stamp}@example.test`,
				emailVerified: true,
				referralCode: `T${stamp}`.slice(0, 12)
			}
		});
		users.push(user.id);
		const actor = await db.actor.create({
			data: { kind: 'PERSON', handle: `${PREFIX}${name}`, displayName: name }
		});
		await db.person.create({
			data: {
				actorId: actor.id,
				userId: user.id,
				birthDate: new Date('1990-01-01'),
				termsAcceptedAt: new Date(),
				createdAt: new Date(Date.now() - ageDays * DAY)
			}
		});
		return actor.id;
	}

	beforeAll(async () => {
		const url = new URL(
			dotenv.config({ quiet: true }).parsed?.DATABASE_URL ?? process.env.DATABASE_URL ?? ''
		);
		url.searchParams.set('schema', 'e2e');
		db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
		await cleanup();
		lea = await person('lea', 10);
		max = await person('max', 2);
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db?.$disconnect();
	}, 120_000);

	it('passe TL1 avec ancienneté, profil complété et un échange réciproque', async () => {
		expect(await tx((t) => trustSummaryFor(t, lea))).toMatchObject({
			accountAgeDays: 10,
			profileComplete: false
		});
		await tx((t) => emitAndProcess(t, { type: 'profile.completed', actorId: lea }));
		expect((await db.actor.findUniqueOrThrow({ where: { id: lea } })).trustLevel).toBe(0);
		await tx((t) =>
			emitAndProcess(t, {
				type: 'conversation.reciprocated',
				actorId: lea,
				counterpartId: max,
				fromOpportunity: true
			})
		);
		expect((await db.actor.findUniqueOrThrow({ where: { id: lea } })).trustLevel).toBe(1);
		expect(
			await db.domainEvent.count({
				where: { type: 'progress.trust_changed', actorIds: { has: lea } }
			})
		).toBe(1);
		// Max : 2 jours d'ancienneté, reste TL0 malgré l'échange.
		expect((await db.actor.findUniqueOrThrow({ where: { id: max } })).trustLevel).toBe(0);
	}, 120_000);

	it('les règles d’XP lisent la confiance réelle de la contrepartie', async () => {
		const result = await tx((t) =>
			emitAndProcess(t, {
				type: 'collaboration.completed',
				collaborationId: 'c1',
				participantIds: [lea, max]
			})
		);
		// Max collabore avec Léa (TL1, ×0,5) ; Léa avec Max (TL0, ×0,1).
		expect(result.gains.find((g) => g.actorId === max)).toMatchObject({
			multiplier: 0.5,
			amount: 200
		});
		expect(result.gains.find((g) => g.actorId === lea)).toMatchObject({
			multiplier: 0.1,
			amount: 40
		});
	}, 120_000);

	it('est rétrogradable : un compte rajeuni repasse TL0', async () => {
		await db.person.update({ where: { actorId: lea }, data: { createdAt: new Date() } });
		const changes = await tx((t) => recomputeTrust(t, [lea, 'acteur-inexistant']));
		expect(changes).toEqual([{ actorId: lea, from: 1, to: 0 }]);
	}, 120_000);
});
