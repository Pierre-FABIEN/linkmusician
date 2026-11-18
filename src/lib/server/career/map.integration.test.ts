/**
 * Carte de carrière (P3-13) sur la base de `.env`, schéma `e2e` : une
 * appréciation reçue après une jam franchit l'acte I ; un morceau composé
 * seul·e ne franchit pas l'acte II, un morceau composé à plusieurs si ; la
 * célébration d'une épreuve ne revient pas. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/career
 */
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
const db = createPrismaClient(url.toString());

vi.mock('#lib/server', () => ({ prisma: db }));

const map = await import('./map');
const sheetService = await import('./sheet');
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

	it('au départ : rien de franchi, rien de faussement à portée (N2)', async () => {
		const m = careerMap(await map.careerFacts(ids.lea));
		expect(m.passed).toEqual([]);
		expect(m.acts.slice(0, 5).map((a) => a.state)).toEqual(Array(5).fill('open'));
		expect((await map.careerMapFor(ids.lea, null)).withinReach).toEqual([]);
		expect(await map.pendingActCelebrations(ids.lea, true)).toEqual([]);
	});

	it('une collaboration passée qui n’attend que sa confirmation met « La rencontre » à portée (N2)', async () => {
		const yesterday = new Date(Date.now() - 2 * 86_400_000);
		const collab = await db.collaboration.create({
			data: {
				kind: 'SESSION_WORK',
				status: 'ACCEPTED',
				title: 'Carte Test session',
				happenedOn: yesterday,
				proposedById: ids.malik,
				participants: {
					create: [
						{ actorId: ids.malik, acceptedAt: yesterday, confirmedCompletionAt: new Date() },
						{ actorId: ids.lea, acceptedAt: yesterday }
					]
				}
			}
		});
		try {
			const m = await map.careerMapFor(ids.lea, null);
			expect(m.withinReach.map((a) => a.number)).toEqual([1]);
			expect(m.withinReach[0].reach?.action.href).toBe('/espace/a-confirmer');
			// Malik a déjà confirmé : rien à portée pour lui, aucune fuite de l'autre côté.
			expect((await map.careerMapFor(ids.malik, null)).withinReach).toEqual([]);
			// Les faits, eux, n'ont pas bougé : rien n'est franchi avant la confirmation.
			expect((await map.careerFacts(ids.lea)).collaborations).toBe(0);
		} finally {
			await db.collaboration.delete({ where: { id: collab.id } });
		}
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
		// N2 : le nom de l'épreuve, sans numéro d'acte ; l'identifiant reste `act-1`.
		expect(first.map((c) => c.title)).toEqual(['Épreuve franchie : La rencontre']);
		expect(first.map((c) => c.id)).toEqual(['act-1']);
		expect(await map.pendingActCelebrations(ids.lea, true)).toEqual([]);
	});

	it('composé seul·e : pas l’acte II ; à plusieurs : l’acte II', async () => {
		await work('Carte Test solo', 'DECLARED', ['lea']);
		let m = careerMap(await map.careerFacts(ids.lea));
		expect(m.passed).toEqual([1]);
		expect(m.soloOnly).toBe(true);
		// Composé seul·e, sans autre rôle en attente : pas de fausse épreuve à portée.
		expect((await map.careerMapFor(ids.lea, null)).acts[1].state).toBe('open');
		// Un rôle attend sa confirmation : « La création » à portée, sans être franchie.
		const pending = await db.work.create({
			data: {
				ownerId: ids.lea,
				createdById: ids.lea,
				title: 'Carte Test en attente',
				state: 'COMPOSED',
				proof: 'DECLARED',
				composedAt: new Date(),
				contributors: {
					create: [{ personId: ids.lea, confirmedAt: new Date() }, { personId: ids.malik }]
				}
			}
		});
		const reach = await map.careerMapFor(ids.lea, null);
		expect(reach.acts[1].state).toBe('within_reach');
		expect(reach.acts[1].reach?.action.href).toBe(`/morceaux/${pending.id}`);
		expect(reach.passed).toEqual([1]);
		// Malik n'a rien confirmé : le morceau ne lui ouvre rien.
		expect((await map.careerMapFor(ids.malik, null)).acts[1].state).toBe('open');
		await db.work.delete({ where: { id: pending.id } });
		await work('Carte Test à deux', 'CORROBORATED', ['lea', 'malik']);
		m = careerMap(await map.careerFacts(ids.lea));
		expect(m.passed).toEqual([1, 2]);
		expect(m).not.toHaveProperty('current');
		expect((await map.pendingActCelebrations(ids.lea, true)).map((c) => c.id)).toEqual(['act-2']);
	});

	it('la fiche publique renvoie uniquement des faits confirmés', async () => {
		const sheet = await sheetService.publicCareerSheet(ids.lea);
		expect(Object.keys(sheet).sort()).toEqual(
			[
				'appreciatedBy',
				'actsPassed',
				'bands',
				'cities',
				'collaborations',
				'credits',
				'gigs',
				'jamsAppreciated',
				'peopleMet',
				'worksTogether'
			].sort()
		);
		expect(JSON.stringify(sheet)).not.toMatch(/xp|level|trust|jamsAttended|worksSolo/i);
	});
});
