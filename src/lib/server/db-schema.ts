/**
 * LINKMUSICIAN: schéma PostgreSQL du SQL brut.
 *
 * Prisma préfixe ses propres requêtes par le schéma de `DATABASE_URL`
 * (`?schema=e2e`), mais pas le SQL brut (`$queryRaw`), qui dépend du
 * `search_path` de la connexion. Or, à travers le pooler Neon (PgBouncer en
 * mode transaction), ce `search_path` n'est pas conservé : mesuré le
 * 04/11/2026, 20 requêtes brutes sur 20 tournaient dans `public` avec
 * `?schema=e2e`. Le SQL brut doit donc nommer son schéma explicitement.
 */
import { Prisma } from '@prisma/client';

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Schéma désigné par une URL de base (`public` par défaut). */
export function schemaOf(url: string | undefined = process.env.DATABASE_URL): string {
	try {
		return new URL(url ?? '').searchParams.get('schema') || 'public';
	} catch {
		return 'public';
	}
}

/** Nom de table qualifié, à insérer dans un `$queryRaw` (`"e2e"."actor_locations"`). */
export function qualifiedTable(table: string, schema = schemaOf()): Prisma.Sql {
	if (!IDENTIFIER.test(schema) || !IDENTIFIER.test(table)) {
		throw new Error(`Identifiant SQL invalide : ${schema}.${table}`);
	}
	return Prisma.raw(`"${schema}"."${table}"`);
}
