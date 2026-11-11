/**
 * Profil d'organisateur·rice (P5-05a) sur la base de `.env`, schéma `e2e` :
 * saisie normalisée, genres contrôlés, export RGPD, et rien ne reste après
 * l'anonymisation. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/prisma/crafts
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

const { getPromoterProfile, savePromoterProfile, UnknownGenreError } =
	await import('./promoterProfile');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');

const PREFIX = 'promoter-test-';

describe.skipIf(!enabled)('profil d’organisateur·rice (schéma e2e)', { timeout: 60_000 }, () => {
	let userId = '';
	let personId = '';
	let rock = '';

	async function cleanup() {
		await db.actor.deleteMany({ where: { person: { user: { email: { startsWith: PREFIX } } } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	beforeAll(async () => {
		await cleanup();
		rock = (await db.genre.findUniqueOrThrow({ where: { slug: 'rock' } })).id;
		userId = (
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
					person: {
						create: {
							userId,
							termsAcceptedAt: new Date(),
							onboardedAt: new Date(),
							tracks: { create: { track: 'PROMOTER', isPrimary: true } }
						}
					}
				}
			})
		).id;
	});

	afterAll(async () => {
		await cleanup();
		await db.$disconnect();
	});

	it('enregistre et relit un profil normalisé', async () => {
		await savePromoterProfile(personId, {
			eventKinds: ['CONCERTS', 'CONCERTS', 'OPEN_STAGES'],
			genreIds: [rock, rock],
			capacity: 120,
			references: [{ title: ' Plateau rock ', url: 'exemple.fr/agenda/plateau' }]
		});
		expect(await getPromoterProfile(personId)).toEqual({
			eventKinds: ['CONCERTS', 'OPEN_STAGES'],
			capacity: 120,
			genres: [{ id: rock, name: expect.any(String) }],
			references: [{ title: 'Plateau rock', url: 'https://exemple.fr/agenda/plateau' }]
		});
	});

	it('refuse un genre inconnu et une jauge hors bornes', async () => {
		const base = { eventKinds: [], genreIds: [], capacity: null, references: [] };
		await expect(
			savePromoterProfile(personId, { ...base, genreIds: ['inconnu'] })
		).rejects.toBeInstanceOf(UnknownGenreError);
		await expect(savePromoterProfile(personId, { ...base, capacity: 0 })).rejects.toThrow(/Jauge/);
	});

	it('RGPD : exporté, puis plus rien après l’anonymisation', async () => {
		const exported = await exportPersonData(userId);
		expect(exported?.profil_organisateur?.jauge_habituelle).toBe(120);
		expect(exported?.travaux_en_ecoute.map((r) => r.metier)).toEqual(['PROMOTER']);
		expect(exported?.candidatures_au_nom_d_un_groupe).toEqual([]);

		await db.$transaction(await personAnonymizationOps(userId));
		expect(await getPromoterProfile(personId)).toBeNull();
		expect(await db.promoterGenre.count({ where: { personId } })).toBe(0);
		expect(await db.craftReference.count({ where: { personId } })).toBe(0);
	});
});
