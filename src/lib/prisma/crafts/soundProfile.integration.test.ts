/**
 * Profil d'ingé son (P4-02) sur la base de `.env`, schéma `e2e` : saisie
 * normalisée et remplacée d'un enregistrement à l'autre ; export RGPD ;
 * l'anonymisation ne laisse rien. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/prisma/crafts
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

const { getSoundProfile, saveSoundProfile } = await import('./soundProfile');
const { exportPersonData, personAnonymizationOps } = await import('#lib/prisma/actors/person');

const PREFIX = 'sound-test-';

describe.skipIf(!enabled)('profil d’ingé son (schéma e2e)', { timeout: 60_000 }, () => {
	let userId = '';
	let personId = '';

	async function cleanup() {
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.actor.deleteMany({ where: { person: { user: { email: { startsWith: PREFIX } } } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	}

	beforeAll(async () => {
		await cleanup();
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
							tracks: { create: { track: 'SOUND_ENGINEER', isPrimary: true } }
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

	it('normalise la saisie, ignore les lignes vides et les doublons', async () => {
		await saveSoundProfile(personId, {
			specialties: ['MIXING', 'MIXING', 'LIVE_FOH'],
			mobility: ['REMOTE'],
			gear: '  Pro Tools  \n\n Neumann   U87 ',
			references: [
				{ title: ' Mix  de « Nuit blanche » ', url: 'soundcloud.com/sam/nuit' },
				{ title: '', url: '' },
				{ title: 'Doublon', url: 'https://soundcloud.com/sam/nuit' }
			]
		});
		expect(await getSoundProfile(personId)).toEqual({
			specialties: ['MIXING', 'LIVE_FOH'],
			mobility: ['REMOTE'],
			gear: 'Pro Tools\nNeumann U87',
			references: [{ title: 'Mix de « Nuit blanche »', url: 'https://soundcloud.com/sam/nuit' }]
		});
	});

	it('remplace les travaux au lieu de les ajouter', async () => {
		await saveSoundProfile(personId, {
			specialties: ['MASTERING'],
			mobility: [],
			gear: '',
			references: [{ title: 'Master EP', url: 'https://bandcamp.com/ep' }]
		});
		const profile = await getSoundProfile(personId);
		expect(profile?.references.map((r) => r.title)).toEqual(['Master EP']);
	});

	it('refuse un lien invalide, même hors formulaire', async () => {
		await expect(
			saveSoundProfile(personId, {
				specialties: [],
				mobility: [],
				gear: '',
				references: [{ title: 'Local', url: 'http://localhost/x' }]
			})
		).rejects.toThrow(/invalide/);
	});

	it('RGPD : exporté, puis plus rien après l’anonymisation', async () => {
		const exported = await exportPersonData(userId);
		expect(exported?.profil_inge_son?.specialites).toEqual(['MASTERING']);
		expect(exported?.travaux_en_ecoute).toHaveLength(1);

		await db.$transaction(await personAnonymizationOps(userId));
		expect(await getSoundProfile(personId)).toBeNull();
		expect(await db.craftReference.count({ where: { personId } })).toBe(0);
	});
});
