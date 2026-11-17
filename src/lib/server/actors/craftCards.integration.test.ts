/**
 * Cartes historiques de `/@handle` sous les blocs D61 (ONB-12c2, Q70), sur la
 * base de `.env`, schéma `e2e` : anonyme, membre, la personne ; recherche des
 * membres. Désactivé par défaut :
 *
 *   PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/actors/craftCards
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

const { getPublicProfile } = await import('./publicProfile');

const PREFIX = 'craftcard-test-';

describe.skipIf(!enabled)(
	'cartes métier filtrées par lecteur (schéma e2e)',
	{ timeout: 60_000 },
	() => {
		const ids = { maya: '', viewer: '' };
		const handle = `${PREFIX}maya`;

		async function cleanup() {
			await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
			await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
		}

		async function person(name: string, extra: object = {}) {
			const userId = (
				await db.user.create({
					data: { email: `${PREFIX}${name}@example.test`, referralCode: `${PREFIX}${name}` }
				})
			).id;
			return (
				await db.actor.create({
					data: {
						kind: 'PERSON',
						handle: `${PREFIX}${name}`,
						displayName: name,
						person: {
							create: { userId, termsAcceptedAt: new Date(), onboardedAt: new Date(), ...extra }
						}
					}
				})
			).id;
		}

		beforeAll(async () => {
			await cleanup();
			ids.maya = await person('maya', {
				// Réglages par défaut de la migration ONB-12b : membres, membres, privé.
				tracks: { create: [{ track: 'PRODUCER', isPrimary: true }, { track: 'SOUND_ENGINEER' }] },
				producerProfile: {
					create: {
						specialties: ['BEATMAKING'],
						mobility: ['REMOTE'],
						software: 'Ableton',
						rate: '300 € le titre'
					}
				},
				soundProfile: { create: { specialties: ['MIXING'], gear: 'SM57' } }
			});
			ids.viewer = await person('viewer');
			await db.craftReference.create({
				data: {
					personId: ids.maya,
					track: 'PRODUCER',
					title: 'EP',
					url: 'https://example.org/ep',
					position: 0
				}
			});
		});
		afterAll(async () => {
			await cleanup();
			await db.$disconnect();
		});

		it('anonyme : ni spécialités, ni matériel, ni tarifs ; le portfolio reste', async () => {
			const p = (await getPublicProfile(handle))!;
			expect(p.producer).toMatchObject({ specialties: [], mobility: [], software: '', rate: '' });
			expect(p.producer!.references.map((r) => r.url)).toEqual(['https://example.org/ep']);
			expect(p.soundEngineer).toMatchObject({ specialties: [], gear: '' });
			// Les réglages ne partent jamais vers le navigateur.
			expect(p.tracks[0]).toEqual({ track: 'PRODUCER', isPrimary: true });
		});

		it('membre : intentions et précisions, pas les conditions privées', async () => {
			const p = (await getPublicProfile(handle, new Date(), ids.viewer, true))!;
			expect(p.producer).toMatchObject({
				specialties: ['BEATMAKING'],
				software: 'Ableton',
				rate: ''
			});
			expect(p.soundEngineer!.gear).toBe('SM57');
		});

		it('connecté·e sans onboarding : traité·e comme anonyme', async () => {
			const p = (await getPublicProfile(handle, new Date(), ids.viewer, false))!;
			expect(p.producer!.software).toBe('');
		});

		it('la personne voit tout ; conditions publiques sur son choix', async () => {
			expect((await getPublicProfile(handle, new Date(), ids.maya))!.producer!.rate).toBe(
				'300 € le titre'
			);
			await db.personTrack.update({
				where: { personId_track: { personId: ids.maya, track: 'PRODUCER' } },
				data: { conditionsVisibility: 'PUBLIC' }
			});
			expect((await getPublicProfile(handle))!.producer!.rate).toBe('300 € le titre');
			// Le bloc d'un autre métier ne change pas.
			expect((await getPublicProfile(handle))!.soundEngineer!.gear).toBe('');
		});
	}
);
