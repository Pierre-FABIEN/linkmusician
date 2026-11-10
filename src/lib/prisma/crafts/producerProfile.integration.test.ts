/**
 * Profil de producteur·rice (P4-04) sur la base de `.env`, schéma `e2e` :
 * saisie normalisée, styles contrôlés, export RGPD, et rien ne reste après
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

const { getProducerProfile, saveProducerProfile, UnknownGenreError } =
	await import('./producerProfile');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');

const PREFIX = 'producer-test-';

describe.skipIf(!enabled)('profil de producteur·rice (schéma e2e)', { timeout: 60_000 }, () => {
	let userId = '';
	let personId = '';
	let funk = '';

	async function cleanup() {
		await db.actor.deleteMany({ where: { person: { user: { email: { startsWith: PREFIX } } } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	beforeAll(async () => {
		await cleanup();
		funk = (await db.genre.findUniqueOrThrow({ where: { slug: 'funk' } })).id;
		userId = (
			await db.user.create({
				data: { email: `${PREFIX}nora@example.test`, referralCode: `${PREFIX}nora` }
			})
		).id;
		personId = (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: `${PREFIX}nora`,
					displayName: 'Nora',
					person: {
						create: {
							userId,
							termsAcceptedAt: new Date(),
							onboardedAt: new Date(),
							tracks: { create: { track: 'PRODUCER', isPrimary: true } }
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
		await saveProducerProfile(personId, {
			specialties: ['BEATMAKING', 'BEATMAKING'],
			genreIds: [funk, funk],
			software: ' Ableton   Live \n\n Serum ',
			rate: '  À partir de   150 € le titre ',
			mobility: ['REMOTE'],
			references: [{ title: ' Lumière ', url: 'soundcloud.com/nora/lumiere' }]
		});
		expect(await getProducerProfile(personId)).toEqual({
			specialties: ['BEATMAKING'],
			genres: [{ id: funk, name: expect.any(String) }],
			software: 'Ableton Live\nSerum',
			rate: 'À partir de 150 € le titre',
			mobility: ['REMOTE'],
			references: [{ title: 'Lumière', url: 'https://soundcloud.com/nora/lumiere' }]
		});
	});

	it('refuse un style inconnu', async () => {
		await expect(
			saveProducerProfile(personId, {
				specialties: [],
				genreIds: ['inconnu'],
				software: '',
				rate: '',
				mobility: [],
				references: []
			})
		).rejects.toBeInstanceOf(UnknownGenreError);
	});

	it('RGPD : exporté, puis plus rien après l’anonymisation', async () => {
		const exported = await exportPersonData(userId);
		expect(exported?.profil_producteur?.tarifs_indicatifs).toBe('À partir de 150 € le titre');
		expect(exported?.travaux_en_ecoute.map((r) => r.metier)).toEqual(['PRODUCER']);

		await db.$transaction(await personAnonymizationOps(userId));
		expect(await getProducerProfile(personId)).toBeNull();
		expect(await db.producerGenre.count({ where: { personId } })).toBe(0);
		expect(await db.craftReference.count({ where: { personId } })).toBe(0);
	});
});
