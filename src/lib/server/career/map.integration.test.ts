/**
 * Carte de carrière (P3-13) sur la base de `.env`, schéma `e2e` : une
 * appréciation reçue après une jam franchit l'acte I ; un morceau composé
 * seul·e ne franchit pas l'acte II, un morceau composé à plusieurs si ; la
 * célébration d'une épreuve ne revient pas. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/career
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

const map = await import('./map');
const { careerMap } = await import('#lib/career/map');
const { emitAndProcess } = await import('#lib/server/progression/processor');

const PREFIX = 'carte-test-';
const YEAR = 365.25 * 86_400_000;

describe.skipIf(!enabled)('carte de carrière (schéma e2e)', { timeout: 90_000 }, () => {
	const ids: Record<string, string> = {};

	async function cleanup() {
		const actors = await db.actor.findMany({
			where: { handle: { startsWith: PREFIX } },
			select: { id: true }
		});
		const list = actors.map((a) => a.id);
		await db.actor.deleteMany({ where: { id: { in: list } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
		if (list.length > 0)
			await db.domainEvent.deleteMany({ where: { actorIds: { hasSome: list } } });
	}

	async function work(title: string, proof: 'DECLARED' | 'CORROBORATED', people: string[]) {
		await db.work.create({
			data: {
				ownerId: ids.lea,
				createdById: ids.lea,
				title,
				state: 'COMPOSED',
				proof,
				composedAt: new Date(),
				contributors: {
					create: people.map((p) => ({ personId: ids[p], confirmedAt: new Date() }))
				}
			}
		});
	}

	beforeAll(async () => {
		await cleanup();
		for (const name of ['lea', 'malik']) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
			});
			ids[name] = (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: PREFIX + name,
						displayName: `Carte Test ${name}`,
						person: {
							create: {
								userId: user.id,
								termsAcceptedAt: new Date(),
								onboardedAt: new Date(),
								birthDate: new Date(Date.now() - 30 * YEAR)
							}
						}
					}
				})
			).id;
		}
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('au départ : rien de franchi, acte I en cours', async () => {
		const m = careerMap(await map.careerFacts(ids.lea));
		expect(m.passed).toEqual([]);
		expect(m.current).toBe(1);
		expect(await map.pendingActCelebrations(ids.lea, true)).toEqual([]);
	});

	it('une appréciation reçue après une jam franchit l’acte I, fêté une seule fois', async () => {
		await db.$transaction((tx) =>
			emitAndProcess(tx, {
				type: 'endorsement.received',
				actorId: ids.lea,
				endorserId: ids.malik,
				skill: 'bon groove',
				jamId: 'carte-test-jam'
			})
		);
		expect((await map.careerFacts(ids.lea)).jamAppreciations).toBe(1);
		const first = await map.pendingActCelebrations(ids.lea, true);
		expect(first.map((c) => c.title)).toEqual(['Épreuve franchie : Acte I · La rencontre']);
		expect(await map.pendingActCelebrations(ids.lea, true)).toEqual([]);
	});

	it('composé seul·e : pas l’acte II ; à plusieurs : l’acte II', async () => {
		await work('Carte Test solo', 'DECLARED', ['lea']);
		let m = careerMap(await map.careerFacts(ids.lea));
		expect(m.passed).toEqual([1]);
		expect(m.soloOnly).toBe(true);
		await work('Carte Test à deux', 'CORROBORATED', ['lea', 'malik']);
		m = careerMap(await map.careerFacts(ids.lea));
		expect(m.passed).toEqual([1, 2]);
		expect(m.current).toBe(3);
		expect((await map.pendingActCelebrations(ids.lea, true)).map((c) => c.id)).toEqual(['act-2']);
	});
});
