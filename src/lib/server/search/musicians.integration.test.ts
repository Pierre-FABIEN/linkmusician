/**
 * Test d'intégration de la recherche (P2-01) sur des communes connues :
 * Toulouse–Blagnac ~7 km, Toulouse–Muret ~20 km, Toulouse–Montauban ~46 km.
 * Écrit dans le schéma `e2e`, jamais dans `public`. Désactivé par défaut :
 *
 *   GEO_INTEGRATION=1 npx vitest --run src/lib/server/search
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { E2E_COMMUNES } from '#lib/geo/communes-e2e';
import { parseFilters } from '#lib/search/filters';
import { setActorLocation } from '../geo/queries';
import { searchMusicians } from './musicians';

const enabled = process.env.GEO_INTEGRATION === '1';
const PREFIX = 'search-test-';
const commune = (nom: string) => E2E_COMMUNES.find((c) => c.nom === nom)!;

type Spec = {
	key: string;
	commune: string;
	instrument?: [slug: string, level: number];
	genre?: string;
	travelRadiusKm?: number;
	lookingFor?: ('JAMS' | 'BAND')[];
	hidden?: boolean;
	suspended?: boolean;
	onboarded?: boolean;
};

const PEOPLE: Spec[] = [
	{ key: 'moi', commune: 'Toulouse' },
	{
		key: 'blagnac',
		commune: 'Blagnac',
		instrument: ['batterie', 2],
		genre: 'funk',
		travelRadiusKm: 25,
		lookingFor: ['JAMS']
	},
	{
		key: 'muret',
		commune: 'Muret',
		instrument: ['batterie', 4],
		genre: 'punk',
		lookingFor: ['BAND']
	},
	{
		key: 'montauban',
		commune: 'Montauban',
		instrument: ['basse', 3],
		genre: 'funk',
		travelRadiusKm: 10
	},
	{ key: 'masque', commune: 'Blagnac', hidden: true },
	{ key: 'suspendu', commune: 'Blagnac', suspended: true },
	{ key: 'debutant', commune: 'Blagnac', onboarded: false }
];

describe.skipIf(!enabled)('recherche de musicien·nes (schéma e2e)', () => {
	let db: PrismaClient;
	const ids: Record<string, string> = {};

	const cleanup = async () => {
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	};

	beforeAll(async () => {
		const url = new URL(
			dotenv.config({ quiet: true }).parsed?.DATABASE_URL ?? process.env.DATABASE_URL ?? ''
		);
		url.searchParams.set('schema', 'e2e');
		db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
		await cleanup();
		for (const spec of PEOPLE) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${spec.key}@example.test`, referralCode: `${PREFIX}${spec.key}` }
			});
			const instrument = spec.instrument
				? await db.instrument.findUniqueOrThrow({ where: { slug: spec.instrument[0] } })
				: null;
			const genre = spec.genre
				? await db.genre.findUniqueOrThrow({ where: { slug: spec.genre } })
				: null;
			const actor = await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + spec.key,
					displayName: spec.key,
					hidden: spec.hidden ?? false,
					person: {
						create: {
							userId: user.id,
							termsAcceptedAt: new Date(),
							onboardedAt: spec.onboarded === false ? null : new Date(),
							travelRadiusKm: spec.travelRadiusKm,
							lookingFor: spec.lookingFor ?? [],
							tracks: { create: { track: 'MUSICIAN', isPrimary: true } },
							instruments: instrument
								? {
										create: {
											instrumentId: instrument.id,
											declaredLevel: spec.instrument![1],
											isPrimary: true
										}
									}
								: undefined
						}
					},
					genres: genre ? { create: { genreId: genre.id } } : undefined
				}
			});
			if (spec.suspended) {
				await db.sanction.create({
					data: { actorId: actor.id, kind: 'SUSPENSION', reason: 'test', createdByUserId: user.id }
				});
			}
			ids[spec.key] = actor.id;
			await setActorLocation(actor.id, commune(spec.commune), { db, schema: 'e2e' });
		}
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db?.$disconnect();
	});

	const search = async (query: string) =>
		(
			await searchMusicians(ids.moi, parseFilters(new URLSearchParams(query)), {
				db,
				schema: 'e2e'
			})
		).results.map((r) => r.handle.replace(PREFIX, ''));

	it('par rayon, du plus proche au plus lointain, profils publics seulement', async () => {
		expect(await search('rayon=10')).toEqual(['blagnac']);
		expect(await search('rayon=25')).toEqual(['blagnac', 'muret']);
		expect(await search('rayon=50')).toEqual(['blagnac', 'muret', 'montauban']);
	});

	it('ne donne qu’une tranche de distance, jamais des mètres', async () => {
		const { results } = await searchMusicians(
			ids.moi,
			parseFilters(new URLSearchParams('rayon=50')),
			{
				db,
				schema: 'e2e'
			}
		);
		expect(results.map((r) => r.distance)).toEqual(['5 à 10 km', '10 à 25 km', '25 à 50 km']);
		expect(JSON.stringify(results)).not.toMatch(/meters|"\d{4,}\./);
	});

	it('instrument et niveau minimal', async () => {
		expect(await search('rayon=50&instrument=batterie')).toEqual(['blagnac', 'muret']);
		expect(await search('rayon=50&instrument=batterie&niveau=3')).toEqual(['muret']);
		expect(await search('rayon=50&niveau=3')).toEqual(['muret', 'montauban']);
	});

	it('un genre parent inclut ses sous-genres', async () => {
		expect(await search('rayon=50&genre=rock')).toEqual(['muret']); // punk ⊂ rock
		expect(await search('rayon=50&genre=funk')).toEqual(['blagnac', 'montauban']);
	});

	it('ce que la personne recherche', async () => {
		expect(await search('rayon=50&recherche=BAND')).toEqual(['muret']);
	});

	it('blocage, dans les deux sens : invisible (P2-05)', async () => {
		await db.block.create({ data: { blockerActorId: ids.blagnac, blockedActorId: ids.moi } });
		expect(await search('rayon=50')).toEqual(['muret', 'montauban']);
		await db.block.deleteMany({ where: { blockerActorId: ids.blagnac } });
		await db.block.create({ data: { blockerActorId: ids.moi, blockedActorId: ids.muret } });
		expect(await search('rayon=50')).toEqual(['blagnac', 'montauban']);
		await db.block.deleteMany({ where: { blockerActorId: ids.moi } });
	});

	it('réciproque : seulement ceux dont le rayon de déplacement me couvre', async () => {
		// Blagnac (rayon 25) et Muret (25 par défaut) me couvrent ; Montauban (10) non.
		expect(await search('rayon=50&reciproque=1')).toEqual(['blagnac', 'muret']);
	});

	it('son réseau musical remonte en tête (P2-16), jamais l’XP', async () => {
		await db.musicalTie.create({ data: { ownerId: ids.moi, contactId: ids.montauban } });
		expect(await search('rayon=50')).toEqual(['montauban', 'blagnac', 'muret']);
		expect(await search('rayon=50&instrument=batterie')).toEqual(['blagnac', 'muret']);
		await db.musicalTie.deleteMany({ where: { ownerId: ids.moi } });
	});

	it('réputation : départage dans une même tranche, sans franchir les tranches (P2-08, D33)', async () => {
		const snapshot = (actorId: string, internalScore: number) =>
			db.reputationSnapshot.create({
				data: {
					actorId,
					confirmedCollabs: 0,
					distinctCounterparts: 0,
					corroboratedGigs: 0,
					verifiedReleases: 0,
					bands: 0,
					distinctEndorsers: 0,
					endorsementsByKind: [],
					internalScore,
					computedAt: new Date()
				}
			});
		// Muret (10 à 25 km) très bien noté ne passe pas devant Blagnac (5 à 10 km).
		await snapshot(ids.muret, 50);
		expect(await search('rayon=50')).toEqual(['blagnac', 'muret', 'montauban']);
		// Montauban ramené à Blagnac : même tranche, la réputation départage.
		await setActorLocation(ids.montauban, commune('Blagnac'), { db, schema: 'e2e' });
		await snapshot(ids.montauban, 5);
		expect(await search('rayon=50')).toEqual(['montauban', 'blagnac', 'muret']);
		// Le score ne sort jamais de la recherche.
		const { results } = await searchMusicians(
			ids.moi,
			parseFilters(new URLSearchParams('rayon=50')),
			{ db, schema: 'e2e' }
		);
		expect(JSON.stringify(results)).not.toMatch(/score|internal|reputation/i);
		await setActorLocation(ids.montauban, commune('Montauban'), { db, schema: 'e2e' });
		await db.reputationSnapshot.deleteMany({
			where: { actorId: { in: [ids.muret, ids.montauban] } }
		});
	});

	it('par métier et spécialité (P4-02) : un·e ingé son sans spécialité reste introuvable', async () => {
		// En dernier : ces deux personnes s'ajoutent aux résultats des autres tests.
		for (const [key, specialties] of [
			['ingeson', ['MIXING', 'MASTERING']],
			['ingevide', []]
		] as const) {
			const user = await db.user.create({
				data: { email: `${PREFIX}${key}@example.test`, referralCode: `${PREFIX}${key}` }
			});
			const actor = await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + key,
					displayName: key,
					person: {
						create: {
							userId: user.id,
							termsAcceptedAt: new Date(),
							onboardedAt: new Date(),
							tracks: { create: { track: 'SOUND_ENGINEER', isPrimary: true } },
							soundProfile: { create: { specialties: [...specialties] } }
						}
					}
				}
			});
			ids[key] = actor.id;
			await setActorLocation(actor.id, commune('Blagnac'), { db, schema: 'e2e' });
		}
		expect(await search('metier=inge-son')).toEqual(['ingeson']);
		expect(await search('metier=inge-son&specialite=mastering')).toEqual(['ingeson']);
		expect(await search('metier=inge-son&specialite=facade')).toEqual([]);
		expect(await search('metier=musicien&rayon=10')).not.toContain('ingeson');
	});

	it('producteur·rice (P4-04) : par spécialité et par style produit', async () => {
		const funk = await db.genre.findUniqueOrThrow({ where: { slug: 'funk' } });
		const user = await db.user.create({
			data: { email: `${PREFIX}prod@example.test`, referralCode: `${PREFIX}prod` }
		});
		const actor = await db.actor.create({
			data: {
				kind: 'PERSON',
				handle: `${PREFIX}prod`,
				displayName: 'prod',
				person: {
					create: {
						userId: user.id,
						termsAcceptedAt: new Date(),
						onboardedAt: new Date(),
						tracks: { create: { track: 'PRODUCER', isPrimary: true } },
						producerProfile: {
							create: {
								specialties: ['BEATMAKING'],
								genres: { create: { genreId: funk.id } }
							}
						}
					}
				}
			}
		});
		ids.prod = actor.id;
		await setActorLocation(actor.id, commune('Blagnac'), { db, schema: 'e2e' });
		expect(await search('metier=producteur')).toEqual(['prod']);
		expect(await search('metier=producteur&specialite=beatmaking&genre=funk')).toEqual(['prod']);
		expect(await search('metier=producteur&specialite=production')).toEqual([]);
		// Le style produit compte aussi dans la recherche sans métier.
		expect(await search('genre=funk&rayon=10')).toContain('prod');
	});
});
