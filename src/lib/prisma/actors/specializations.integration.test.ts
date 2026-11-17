/**
 * Spécialités et intentions par métier (ONB-01) sur la base de `.env`,
 * schéma `e2e` : relecture exacte, recopie dans les colonnes historiques,
 * cascade au retrait d'un métier, recopie de la migration rejouable, RGPD.
 * Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/prisma/actors
 */
import fs from 'node:fs';
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

const {
	getTrackAnswers,
	getTrackDetails,
	setTrackDetails,
	InvalidFieldError,
	InvalidTrackCodeError,
	TrackNotHeldError
} = await import('./specializations');
const { setPersonTracks } = await import('./tracks');
const { saveSoundProfile, getSoundProfile } = await import('#lib/prisma/crafts/soundProfile');
const { exportPersonData, personAnonymizationOps } = await import('./person');

const PREFIX = 'spec-test-';

/** Recopie de la migration, exécutée telle quelle dans le schéma `e2e`. */
function backfillStatements(): string[] {
	const dir = fs
		.readdirSync('prisma/migrations')
		.find((d) => d.endsWith('_specialites_par_metier'));
	const sql = fs.readFileSync(`prisma/migrations/${dir}/migration.sql`, 'utf8');
	return sql
		.slice(sql.indexOf('-- Recopie'))
		.split(';')
		.map((s) => s.replace(/^--.*$/gm, '').trim())
		.filter(Boolean);
}

describe.skipIf(!enabled)('spécialités par métier (schéma e2e)', { timeout: 60_000 }, () => {
	let userId = '';
	let personId = '';

	async function cleanup() {
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	beforeAll(async () => {
		await cleanup();
		userId = (
			await db.user.create({
				data: { email: `${PREFIX}alex@example.test`, referralCode: `${PREFIX}alex` }
			})
		).id;
		personId = (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: `${PREFIX}alex`,
					displayName: 'Alex',
					person: {
						create: {
							userId,
							termsAcceptedAt: new Date(),
							onboardedAt: new Date(),
							tracks: {
								create: [
									{ track: 'MUSICIAN', isPrimary: true },
									{ track: 'SOUND_ENGINEER' },
									{ track: 'MANAGER' }
								]
							}
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

	it('relit exactement 2+ métiers avec 2+ spécialités chacun', async () => {
		await setTrackDetails(personId, {
			track: 'MUSICIAN',
			specializations: ['LYRICIST', 'COMPOSER', 'LYRICIST'],
			offers: [],
			needs: []
		});
		await setTrackDetails(personId, {
			track: 'SOUND_ENGINEER',
			specializations: ['RF', 'MIXING', 'LIVE_FOH'],
			offers: [],
			needs: []
		});
		await setTrackDetails(personId, {
			track: 'MANAGER',
			specializations: ['TOUR_MANAGEMENT', 'ARTIST_MANAGEMENT'],
			offers: [],
			needs: []
		});
		expect(await getTrackDetails(personId)).toEqual([
			{ track: 'MUSICIAN', specializations: ['COMPOSER', 'LYRICIST'], offers: [], needs: [] },
			{
				track: 'SOUND_ENGINEER',
				specializations: ['MIXING', 'LIVE_FOH', 'RF'],
				offers: [],
				needs: []
			},
			{
				track: 'MANAGER',
				specializations: ['ARTIST_MANAGEMENT', 'TOUR_MANAGEMENT'],
				offers: [],
				needs: []
			}
		]);
	});

	it('recopie les codes historiques dans le profil (source de la recherche)', async () => {
		expect((await getSoundProfile(personId))?.specialties).toEqual(['MIXING', 'LIVE_FOH']);
	});

	it('l’enregistrement de /profil/son garde les nouveaux codes', async () => {
		await saveSoundProfile(personId, {
			specialties: ['MASTERING'],
			mobility: [],
			gear: '',
			references: []
		});
		const sound = (await getTrackDetails(personId)).find((d) => d.track === 'SOUND_ENGINEER');
		expect(sound?.specializations).toEqual(['MASTERING', 'RF']);
	});

	it('refuse un code inconnu, d’un autre métier, ou un métier non déclaré', async () => {
		await expect(
			setTrackDetails(personId, {
				track: 'MANAGER',
				specializations: ['MIXING'],
				offers: [],
				needs: []
			})
		).rejects.toBeInstanceOf(InvalidTrackCodeError);
		await expect(
			setTrackDetails(personId, {
				track: 'PUBLISHER',
				specializations: ['SYNC'],
				offers: [],
				needs: []
			})
		).rejects.toBeInstanceOf(TrackNotHeldError);
	});

	it('retirer un métier efface ses spécialités ; le reprendre recopie son profil', async () => {
		await setPersonTracks(personId, { tracks: ['MUSICIAN', 'MANAGER'], primary: 'MUSICIAN' });
		expect(
			await db.personTrackSpecialization.count({ where: { personId, track: 'SOUND_ENGINEER' } })
		).toBe(0);
		await setPersonTracks(personId, {
			tracks: ['MUSICIAN', 'SOUND_ENGINEER', 'MANAGER'],
			primary: 'MUSICIAN'
		});
		const sound = (await getTrackDetails(personId)).find((d) => d.track === 'SOUND_ENGINEER');
		expect(sound?.specializations).toEqual(['MASTERING']);
	});

	it('la recopie de la migration est rejouable sans effet', async () => {
		await db.personTrackSpecialization.deleteMany({ where: { personId, track: 'SOUND_ENGINEER' } });
		const run = () =>
			db.$transaction(
				async (tx) => {
					await tx.$executeRawUnsafe('SET LOCAL search_path TO "e2e"');
					// D'autres fichiers de test créent et suppriment des personnes en parallèle.
					await tx.$executeRawUnsafe('LOCK TABLE "person_tracks" IN SHARE MODE');
					for (const statement of backfillStatements()) await tx.$executeRawUnsafe(statement);
				},
				{ maxWait: 15_000, timeout: 30_000 }
			);
		await run();
		await run();
		expect(
			await db.personTrackSpecialization.findMany({
				where: { personId, track: 'SOUND_ENGINEER' },
				select: { code: true }
			})
		).toEqual([{ code: 'MASTERING' }]);
	});

	it('champs propres (D59) : enregistrés, relus, requis vérifiés, masqués retirés', async () => {
		const sound = {
			track: 'SOUND_ENGINEER' as const,
			specializations: ['MIXING', 'LIVE_FOH'],
			offers: ['MIXING_SERVICE'],
			needs: ['FIND_LIVE_DATES']
		};
		await expect(setTrackDetails(personId, sound, { answers: {} })).rejects.toBeInstanceOf(
			InvalidFieldError
		);
		await setTrackDetails(personId, sound, {
			answers: {
				environment: ['LIVE', 'HOME_STUDIO'],
				live_capacity: ['UP_TO_500'],
				mastering_targets: ['VINYL']
			}
		});
		expect(await getTrackAnswers(personId, 'SOUND_ENGINEER')).toEqual({
			environment: ['HOME_STUDIO', 'LIVE'],
			live_capacity: ['UP_TO_500']
		});
		const exported = await exportPersonData(userId);
		expect(exported?.precisions_par_metier).toContainEqual({
			metier: 'SOUND_ENGINEER',
			champ: 'live_capacity',
			valeur: 'UP_TO_500'
		});
	});

	it('disponibilités (ONB-12c3) : page du métier seulement, gardées par l’inscription', async () => {
		const sound = {
			track: 'SOUND_ENGINEER' as const,
			specializations: ['MIXING', 'LIVE_FOH'],
			offers: ['MIXING_SERVICE'],
			needs: ['FIND_LIVE_DATES']
		};
		const base = { environment: ['LIVE'], live_capacity: ['UP_TO_500'] };
		await setTrackDetails(personId, sound, {
			answers: { ...base, availability_start: ['WEEKS'], availability_rhythm: ['WEEKENDS'] }
		});
		// L'écran de l'inscription ne les connaît pas : il les refuse…
		await expect(
			setTrackDetails(personId, sound, {
				answers: { ...base, availability_start: ['NOW'] },
				stage: 'onboarding'
			})
		).rejects.toBeInstanceOf(InvalidFieldError);
		// … et, en les ignorant, ne les efface pas.
		await setTrackDetails(personId, sound, {
			answers: { environment: ['HOME_STUDIO'], live_capacity: ['UP_TO_500'] },
			stage: 'onboarding'
		});
		expect(await getTrackAnswers(personId, 'SOUND_ENGINEER')).toEqual({
			environment: ['HOME_STUDIO'],
			live_capacity: ['UP_TO_500'],
			availability_start: ['WEEKS'],
			availability_rhythm: ['WEEKENDS']
		});
		const exported = await exportPersonData(userId);
		expect(exported?.precisions_par_metier).toContainEqual({
			metier: 'SOUND_ENGINEER',
			champ: 'availability_start',
			valeur: 'WEEKS'
		});
	});

	it('RGPD : exporté, puis plus rien après l’anonymisation', async () => {
		const exported = await exportPersonData(userId);
		expect(exported?.specialites_et_intentions_par_metier).toContainEqual({
			metier: 'MANAGER',
			specialites: ['ARTIST_MANAGEMENT', 'TOUR_MANAGEMENT'],
			je_propose: [],
			je_recherche: []
		});
		await db.$transaction(await personAnonymizationOps(userId));
		expect(await db.personTrackSpecialization.count({ where: { personId } })).toBe(0);
		expect(await db.personTrackIntent.count({ where: { personId } })).toBe(0);
	});
});
