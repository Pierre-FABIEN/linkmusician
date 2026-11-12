/**
 * Profil de musicien·ne (ONB-03) sur la base de `.env`, schéma `e2e` :
 * scénario Thomas relu à l'identique, copie `lookingFor`, modification
 * depuis `/profil`, métier retiré puis repris, recopie de la migration
 * rejouable, RGPD. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/prisma/musician
 */
import fs from 'node:fs';
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

const { getMusicianStep, saveMusicianStep, InvalidDetailError } = await import('./musicianProfile');
const { saveProfileDetails } = await import('#lib/prisma/actors/profile');
const { profileSchema } = await import('#lib/schema/actors/profileSchema');
const { LINK_KINDS } = await import('#lib/actors/profile');
const { setPersonTracks } = await import('#lib/prisma/actors/tracks');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');

const PREFIX = 'musician-test-';

/** Recopie de la migration, exécutée telle quelle dans le schéma `e2e`. */
function backfillStatements(): string[] {
	const dir = fs.readdirSync('prisma/migrations').find((d) => d.endsWith('_profil_musicien'));
	const sql = fs.readFileSync(`prisma/migrations/${dir}/migration.sql`, 'utf8');
	return sql
		.slice(sql.indexOf('-- Recopie'))
		.split(';')
		.map((s) => s.replace(/^--.*$/gm, '').trim())
		.filter(Boolean);
}

const thomas = {
	practiceExperience: 'WITH_OTHERS' as const,
	commitment: 'REGULAR' as const,
	specializations: [],
	offers: ['PLAY_JAMS'],
	needs: ['FIND_JAMS', 'FIND_PARTNERS'],
	details: {
		'guitar.role': ['LEAD', 'RHYTHM'],
		'voice.languages': ['EN', 'FR'],
		'voice.range': ['UNKNOWN']
	}
};

describe.skipIf(!enabled)('profil de musicien·ne (schéma e2e)', { timeout: 60_000 }, () => {
	let userId = '';
	let personId = '';

	async function cleanup() {
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	beforeAll(async () => {
		await cleanup();
		const [guitar, voice] = await Promise.all([
			db.instrument.findUniqueOrThrow({ where: { slug: 'guitare-electrique' } }),
			db.instrument.findUniqueOrThrow({ where: { slug: 'chant' } })
		]);
		userId = (
			await db.user.create({
				data: { email: `${PREFIX}thomas@example.test`, referralCode: `${PREFIX}thomas` }
			})
		).id;
		personId = (
			await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: `${PREFIX}thomas`,
					displayName: 'Thomas',
					person: {
						create: {
							userId,
							termsAcceptedAt: new Date(),
							tracks: { create: { track: 'MUSICIAN', isPrimary: true } },
							instruments: {
								create: [
									{ instrumentId: guitar.id, declaredLevel: 3, isPrimary: true },
									{ instrumentId: voice.id, declaredLevel: 3 }
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

	it('Thomas : relu à l’identique, lookingFor tenu à jour, onboarding fini', async () => {
		await saveMusicianStep(personId, thomas, { finishOnboarding: true });
		expect(await getMusicianStep(personId)).toEqual({
			practiceExperience: 'WITH_OTHERS',
			commitment: 'REGULAR',
			specializations: [],
			offers: ['PLAY_JAMS'],
			needs: ['FIND_JAMS', 'FIND_PARTNERS'],
			details: {
				'voice.languages': ['FR', 'EN'],
				'voice.range': ['UNKNOWN'],
				'guitar.role': ['RHYTHM', 'LEAD']
			}
		});
		const person = await db.person.findUniqueOrThrow({ where: { actorId: personId } });
		expect(person.lookingFor).toEqual(['JAMS']);
		expect(person.onboardedAt).not.toBeNull();
	});

	it('refuse une précision d’un instrument qu’il n’a pas, et une spécialité retirée', async () => {
		await expect(
			saveMusicianStep(personId, { ...thomas, details: { 'voice.range': ['TENOR', 'BASS'] } })
		).rejects.toBeInstanceOf(InvalidDetailError);
		await expect(
			saveMusicianStep(personId, { ...thomas, specializations: ['GUITARIST'] })
		).rejects.toThrow(/retiré/);
	});

	it('/profil : modifier lookingFor met à jour les intentions, sans toucher aux autres', async () => {
		await saveProfileDetails(
			{ actorId: personId },
			profileSchema.parse({
				lookingFor: ['JAMS', 'LESSONS_GIVE'],
				links: Object.fromEntries(LINK_KINDS.map((k) => [k, '']))
			})
		);
		const step = await getMusicianStep(personId);
		expect(step.offers).toEqual(['PLAY_JAMS', 'GIVE_LESSONS']);
		expect(step.needs).toEqual(['FIND_JAMS', 'FIND_PARTNERS']);
	});

	it('métier retiré puis repris : intentions recopiées depuis lookingFor', async () => {
		await setPersonTracks(personId, { tracks: ['PRODUCER'], primary: 'PRODUCER' });
		expect(await db.personTrackIntent.count({ where: { personId, track: 'MUSICIAN' } })).toBe(0);
		await setPersonTracks(personId, { tracks: ['MUSICIAN', 'PRODUCER'], primary: 'MUSICIAN' });
		const step = await getMusicianStep(personId);
		expect(step.offers).toEqual(['GIVE_LESSONS']);
		expect(step.needs).toEqual(['FIND_JAMS']);
	});

	it('la recopie de la migration est rejouable sans effet', async () => {
		await db.personTrackIntent.deleteMany({ where: { personId, track: 'MUSICIAN' } });
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
		const rows = await db.personTrackIntent.findMany({
			where: { personId, track: 'MUSICIAN' },
			select: { direction: true, code: true },
			orderBy: { code: 'asc' }
		});
		expect(rows).toEqual([
			{ direction: 'NEED', code: 'FIND_JAMS' },
			{ direction: 'OFFER', code: 'GIVE_LESSONS' }
		]);
	});

	it('RGPD : exporté, puis plus rien après l’anonymisation', async () => {
		await saveMusicianStep(personId, thomas);
		const exported = await exportPersonData(userId);
		expect(exported?.profil_musicien).toMatchObject({
			experience_declaree: 'WITH_OTHERS',
			engagement_souhaite: 'REGULAR'
		});
		expect(exported?.precisions_par_metier).toContainEqual({
			metier: 'MUSICIAN',
			champ: 'voice.range',
			valeur: 'UNKNOWN'
		});
		await db.$transaction(await personAnonymizationOps(userId));
		expect(await db.musicianProfile.count({ where: { personId } })).toBe(0);
		expect(await db.personTrackAttribute.count({ where: { personId } })).toBe(0);
	});
});
