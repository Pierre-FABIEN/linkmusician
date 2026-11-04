/**
 * Seul fichier qui lit ou écrit la colonne PostGIS `actor_locations.point`
 * (SQL brut). Types et fonctions sont qualifiés `public.` : PostGIS est
 * installé dans `public`, et ces requêtes tournent aussi dans le schéma `e2e`.
 *
 * Chaque fonction accepte un client Prisma en dernier paramètre (le client de
 * l'application par défaut), pour les tests d'intégration.
 */
import type { PrismaClient } from '@prisma/client';
import { fuzzedPointOf, type Commune } from '#lib/geo/fuzz';

export type GeoDb = Pick<PrismaClient, '$executeRaw' | '$queryRaw'>;

async function appDb(): Promise<GeoDb> {
	return (await import('#lib/server')).prisma;
}

/**
 * Enregistre la commune d'un acteur. Le point stocké est calculé ici, à
 * partir du seul centre de la commune (`fuzzedPointOf`) : jamais une position
 * fournie par le navigateur.
 */
export async function setActorLocation(actorId: string, commune: Commune, db?: GeoDb) {
	const client = db ?? (await appDb());
	const { lat, lng } = fuzzedPointOf(commune);
	await client.$executeRaw`
		INSERT INTO "actor_locations" ("actorId", "communeCode", "communeName", "departmentCode", "point", "updatedAt")
		VALUES (${actorId}, ${commune.code}, ${commune.nom}, ${commune.codeDepartement},
			public.ST_SetSRID(public.ST_MakePoint(${lng}, ${lat}), 4326)::public.geography, now())
		ON CONFLICT ("actorId") DO UPDATE SET
			"communeCode" = EXCLUDED."communeCode",
			"communeName" = EXCLUDED."communeName",
			"departmentCode" = EXCLUDED."departmentCode",
			"point" = EXCLUDED."point",
			"updatedAt" = now()`;
}

export async function clearActorLocation(actorId: string, db?: GeoDb) {
	const client = db ?? (await appDb());
	await client.$executeRaw`DELETE FROM "actor_locations" WHERE "actorId" = ${actorId}`;
}

export type ActorLocationView = {
	communeCode: string;
	communeName: string;
	departmentCode: string;
};

/** Commune d'un acteur (jamais le point). */
export async function getActorLocation(
	actorId: string,
	db?: GeoDb
): Promise<ActorLocationView | null> {
	const client = db ?? (await appDb());
	const rows = await client.$queryRaw<ActorLocationView[]>`
		SELECT "communeCode", "communeName", "departmentCode"
		FROM "actor_locations" WHERE "actorId" = ${actorId}`;
	return rows[0] ?? null;
}

/**
 * Acteurs situés à moins de `radiusKm` d'un acteur (lui exclu), du plus proche
 * au plus lointain. La distance renvoyée sert au tri et aux tranches
 * (`distanceBand`), jamais à un affichage précis.
 */
export async function findActorsNear(
	actorId: string,
	radiusKm: number,
	db?: GeoDb
): Promise<{ actorId: string; communeName: string; meters: number }[]> {
	const client = db ?? (await appDb());
	const rows = await client.$queryRaw<{ actorId: string; communeName: string; meters: number }[]>`
		SELECT other."actorId", other."communeName",
			public.ST_Distance(me."point", other."point")::float8 AS meters
		FROM "actor_locations" me
		JOIN "actor_locations" other
			ON other."actorId" <> me."actorId"
			AND public.ST_DWithin(me."point", other."point", ${radiusKm * 1000})
		WHERE me."actorId" = ${actorId}
		ORDER BY meters ASC`;
	return rows;
}
