/**
 * Suggestions de musicien·nes (P2-18), sur la base de `.env`, schéma `e2e`.
 * Désactivé par défaut :
 *
 *   GEO_INTEGRATION=1 npx vitest --run src/lib/server/discovery
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { E2E_COMMUNES } from '#lib/geo/communes-e2e';
import { setActorLocation } from '../geo/queries';
import { dismissSuggestion, suggestMusicians } from './suggestions';

const enabled = process.env.GEO_INTEGRATION === '1';
const PREFIX = 'suggest-test-';
const commune = (nom: string) => E2E_COMMUNES.find((c) => c.nom === nom)!;
const YEAR = 365.25 * 86_400_000;

type Spec = {
	key: string;
	commune: string;
	instrument: [slug: string, level: number];
	genre: string;
	age?: number;
};

const PEOPLE: Spec[] = [
	// Moi : guitariste rock, niveau 3, à Toulouse.
	{ key: 'moi', commune: 'Toulouse', instrument: ['guitare-electrique', 3], genre: 'rock' },
	// Une batteuse rock de mon niveau, à Muret (10 à 25 km).
	{ key: 'batteuse', commune: 'Muret', instrument: ['batterie', 3], genre: 'rock' },
	// Un batteur rock bien plus avancé, plus près (5 à 10 km).
	{ key: 'expert', commune: 'Blagnac', instrument: ['batterie', 5], genre: 'rock' },
	// Un autre guitariste jazz : ni genre ni rôle en commun.
	{ key: 'jazzman', commune: 'Blagnac', instrument: ['guitare-electrique', 3], genre: 'jazz' },
	// Une bassiste rock de 17 ans.
	{ key: 'mineure', commune: 'Blagnac', instrument: ['basse', 3], genre: 'rock', age: 17 }
];

describe.skipIf(!enabled)('suggestions de musicien·nes (schéma e2e)', () => {
	let db: PrismaClient;
	const ids: Record<string, string> = {};

	const cleanup = async () => {
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
	};
	const suggest = async () =>
		(await suggestMusicians(ids.moi, { db, schema: 'e2e' })).map((s) =>
			s.handle.replace(PREFIX, '')
		);

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
			const instrument = await db.instrument.findUniqueOrThrow({
				where: { slug: spec.instrument[0] }
			});
			const genre = await db.genre.findUniqueOrThrow({ where: { slug: spec.genre } });
			const actor = await db.actor.create({
				data: {
					kind: 'PERSON',
					handle: PREFIX + spec.key,
					displayName: spec.key,
					person: {
						create: {
							userId: user.id,
							termsAcceptedAt: new Date(),
							onboardedAt: new Date(),
							birthDate: new Date(Date.now() - (spec.age ?? 30) * YEAR),
							instruments: {
								create: {
									instrumentId: instrument.id,
									declaredLevel: spec.instrument[1],
									isPrimary: true
								}
							}
						}
					},
					genres: { create: { genreId: genre.id } }
				}
			});
			ids[spec.key] = actor.id;
			await setActorLocation(actor.id, commune(spec.commune), { db, schema: 'e2e' });
		}
	}, 120_000);

	afterAll(async () => {
		await cleanup();
		await db?.$disconnect();
	});

	it('une batteuse rock de mon niveau en tête, avant un batteur plus proche mais plus avancé', async () => {
		const list = await suggest();
		expect(list.slice(0, 2)).toEqual(['batteuse', 'expert']);
		expect(list).not.toContain('jazzman');
		const [first] = await suggestMusicians(ids.moi, { db, schema: 'e2e' });
		expect(first.reason).toBe('Rock en commun · batterie · niveau proche');
		expect(first.distance).toBe('10 à 25 km');
		expect(JSON.stringify(first)).not.toMatch(/meters|"\d{4,}\.|xp|trust/i);
	});

	it('un·e mineur·e n’est jamais suggéré·e à un adulte inconnu, seulement dans son réseau', async () => {
		expect(await suggest()).not.toContain('mineure');
		await db.musicalTie.create({ data: { ownerId: ids.moi, contactId: ids.mineure } });
		expect((await suggest())[0]).toBe('mineure'); // le réseau d'abord
		await db.musicalTie.deleteMany({ where: { ownerId: ids.moi } });
	});

	it('l’XP ne change pas l’ordre', async () => {
		const before = await suggest();
		const source = await db.domainEvent.create({
			data: { type: 'profile.completed', payload: {}, actorIds: [ids.expert] }
		});
		await db.xpTransaction.create({
			data: {
				actorId: ids.expert,
				track: 'ACCOUNT',
				amount: 1_000_000,
				ruleId: `${PREFIX}rule`,
				ruleVersion: 1,
				multiplier: 1,
				reason: 'test',
				sourceEventId: source.id
			}
		});
		await db.actor.update({ where: { id: ids.expert }, data: { trustLevel: 3 } });
		expect(await suggest()).toEqual(before);
		await db.domainEvent.deleteMany({ where: { id: source.id } }).catch(() => {});
	});

	it('« Pas intéressé·e » retire la suggestion', async () => {
		expect(await dismissSuggestion(db, ids.moi, `${PREFIX}batteuse`)).toBe(true);
		expect(await suggest()).not.toContain('batteuse');
		expect(await dismissSuggestion(db, ids.moi, `${PREFIX}moi`)).toBe(false);
	});

	it('« Dans le même style » : la musique du profil regardé, sans lui ni moi', async () => {
		const like = (
			await suggestMusicians(ids.moi, { db, schema: 'e2e' }, { likeActorId: ids.jazzman })
		).map((s) => s.handle.replace(PREFIX, ''));
		expect(like).not.toContain('jazzman');
		expect(like).not.toContain('moi');
		// Le jazzman est guitariste : les batteurs le complètent.
		expect(like).toContain('expert');
	});
});
