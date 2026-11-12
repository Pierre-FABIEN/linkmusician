/**
 * Test d'intégration PostGIS (P1-05) : recherche par rayon sur 5 communes
 * connues. Il écrit dans le schéma `e2e` de la base de `.env`, jamais dans
 * `public`. Désactivé par défaut ; pour le lancer :
 *
 *   GEO_INTEGRATION=1 npx vitest --run src/lib/server/geo
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '../../../../prisma/client.js';
import dotenv from 'dotenv';
import { E2E_COMMUNES } from '#lib/geo/communes-e2e';
import { clearActorLocation, findActorsNear, getActorLocation, setActorLocation } from './queries';

const enabled = process.env.GEO_INTEGRATION === '1';
const PREFIX = 'geo-test-';

describe.skipIf(!enabled)('localisation PostGIS (schéma e2e)', () => {
	let db: PrismaClient;
	const ids: Record<string, string> = {};

	beforeAll(async () => {
		const url = new URL(
			dotenv.config({ quiet: true }).parsed?.DATABASE_URL ?? process.env.DATABASE_URL ?? ''
		);
		url.searchParams.set('schema', 'e2e');
		db = createPrismaClient(url.toString());
		await db.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		for (const commune of E2E_COMMUNES) {
			const actor = await db.actor.create({
				data: { kind: 'PERSON', handle: PREFIX + commune.code, displayName: commune.nom }
			});
			ids[commune.nom] = actor.id;
			await setActorLocation(actor.id, commune, { db, schema: 'e2e' });
		}
	}, 60_000);

	afterAll(async () => {
		await db?.actor.deleteMany({ where: { handle: { startsWith: PREFIX } } });
		await db?.$disconnect();
	});

	const near = async (km: number) =>
		(await findActorsNear(ids.Toulouse, km, { db, schema: 'e2e' })).map((r) => r.communeName);

	it('trouve les acteurs dans le rayon, du plus proche au plus lointain', async () => {
		expect(await near(10)).toEqual(['Blagnac']);
		expect(await near(25)).toEqual(['Blagnac', 'Muret']);
		expect(await near(50)).toEqual(['Blagnac', 'Muret', 'Montauban']);
		expect(await near(1000)).toEqual(['Blagnac', 'Muret', 'Montauban', 'Paris']);
	});

	it('ne renvoie que la commune, et met à jour sans doublon', async () => {
		expect(await getActorLocation(ids.Muret, { db, schema: 'e2e' })).toEqual({
			communeCode: '31395',
			communeName: 'Muret',
			departmentCode: '31'
		});
		await setActorLocation(ids.Muret, E2E_COMMUNES[1], { db, schema: 'e2e' }); // Muret déménage à Blagnac
		expect((await getActorLocation(ids.Muret, { db, schema: 'e2e' }))?.communeName).toBe('Blagnac');
		await clearActorLocation(ids.Muret, { db, schema: 'e2e' });
		expect(await getActorLocation(ids.Muret, { db, schema: 'e2e' })).toBeNull();
	});
});
