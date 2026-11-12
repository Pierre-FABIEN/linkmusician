/**
 * Onboarding adaptatif (ONB-02) sur la base de `.env`, schéma `e2e` : état
 * déduit des métiers et de leurs confirmations, fin de l'onboarding sans
 * étape « intention ». Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/onboarding.integration.test.ts
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

const { onboardingStateOf, finishIfComplete } = await import('./onboarding');
const { setTrackDetails } = await import('#lib/prisma/actors/specializations');
const { setPersonTracks } = await import('#lib/prisma/actors/tracks');
const { currentStep } = await import('#lib/onboarding/steps');

const PREFIX = 'onb-test-';

describe.skipIf(!enabled)('onboarding adaptatif (schéma e2e)', { timeout: 60_000 }, () => {
	let personId = '';
	let genreId = '';

	async function cleanup() {
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	beforeAll(async () => {
		await cleanup();
		genreId = (await db.genre.findFirstOrThrow({ where: { active: true } })).id;
		const userId = (
			await db.user.create({
				data: { email: `${PREFIX}sam@example.test`, referralCode: `${PREFIX}sam` }
			})
		).id;
		personId = (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: `${PREFIX}sam`,
					displayName: 'Sam',
					genres: { create: { genreId } },
					person: {
						create: {
							userId,
							termsAcceptedAt: new Date(),
							tracks: {
								create: [{ track: 'MUSICIAN', isPrimary: true }, { track: 'SOUND_ENGINEER' }]
							}
						}
					}
				}
			})
		).id;
		// Une commune : un point de grille suffit, comme `setActorLocation`.
		await db.$executeRawUnsafe(
			`INSERT INTO "e2e"."actor_locations" ("actorId", "communeCode", "communeName", "departmentCode", "point", "updatedAt")
			 VALUES ($1, '31555', 'Toulouse', '31', public.ST_SetSRID(public.ST_MakePoint(1.44, 43.6), 4326)::public.geography, now())`,
			personId
		);
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('déduit les métiers, le principal et les confirmations', async () => {
		const state = await onboardingStateOf(personId);
		expect(state).toMatchObject({
			tracks: ['MUSICIAN', 'SOUND_ENGINEER'],
			primary: 'MUSICIAN',
			confirmedTracks: [],
			instrumentCount: 0,
			genreCount: 1,
			hasZone: true,
			onboarded: false
		});
		expect(currentStep(state)).toBe('instruments');
	});

	it('valider l’étape d’un métier la marque faite', async () => {
		await setTrackDetails(
			personId,
			{ track: 'SOUND_ENGINEER', specializations: ['MIXING'], offers: [], needs: [] },
			{ confirm: true }
		);
		expect((await onboardingStateOf(personId)).confirmedTracks).toEqual(['SOUND_ENGINEER']);
		// L'étape « intention » reste à faire : pas de fin d'onboarding ici.
		expect(await finishIfComplete(personId)).toBe(false);
	});

	it('retirer le métier musicien·ne en cours de route permet de terminer', async () => {
		await setPersonTracks(personId, { tracks: ['SOUND_ENGINEER'], primary: 'SOUND_ENGINEER' });
		const state = await onboardingStateOf(personId);
		expect(currentStep(state)).toBeNull();
		expect(await finishIfComplete(personId)).toBe(true);
		expect((await onboardingStateOf(personId)).onboarded).toBe(true);
		// Rejouable sans effet.
		expect(await finishIfComplete(personId)).toBe(true);
	});

	it('un métier ajouté ensuite a son étape à faire', async () => {
		await setPersonTracks(personId, {
			tracks: ['SOUND_ENGINEER', 'PRODUCER'],
			primary: 'SOUND_ENGINEER'
		});
		const state = await onboardingStateOf(personId);
		expect(state.confirmedTracks).toEqual(['SOUND_ENGINEER']);
		expect(currentStep(state)).toBe('metier:PRODUCER');
	});
});
