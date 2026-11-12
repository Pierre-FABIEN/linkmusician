// LINKMUSICIAN: fabrique unique du client Prisma 7 (DT-01a).
//
// Prisma 7 se connecte par un adaptateur (`@prisma/adapter-pg`, pilote
// `pg`). Or l'adaptateur IGNORE le paramètre `?schema=` de l'URL : mesuré le
// 12/11/2026, un client sur `…?schema=e2e` lisait les 29 comptes de `public`
// au lieu des 0 de `e2e`. Le schéma doit donc être passé en option, ce que
// fait cette fabrique. Tout `PrismaClient` du dépôt (application, seeds,
// scripts, tests d'intégration, e2e) passe par elle.
//
// Fichier JavaScript annoté (JSDoc) : les seeds lancés par `node` et le
// support e2e, qui n'importe jamais `#lib`, l'utilisent aussi.
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Sépare le schéma PostgreSQL de l'URL et fixe le mode SSL.
 *
 * `pg` traite déjà `sslmode=require` comme `verify-full` (certificat vérifié)
 * et avertit que ce sens changera : on l'écrit explicitement, ce qui garde le
 * comportement actuel et fait taire l'avertissement.
 *
 * @param {string} url
 * @returns {{ connectionString: string, schema: string | undefined }}
 */
export function connectionOf(url) {
	const parsed = new URL(url);
	const schema = parsed.searchParams.get('schema') || undefined;
	parsed.searchParams.delete('schema');
	const sslmode = parsed.searchParams.get('sslmode');
	if (sslmode === 'require' || sslmode === 'prefer' || sslmode === 'verify-ca') {
		parsed.searchParams.set('sslmode', 'verify-full');
	}
	return { connectionString: parsed.toString(), schema };
}

/**
 * Client Prisma sur `url` (par défaut `DATABASE_URL`), schéma compris.
 *
 * Les délais reprennent ceux de Prisma 5 : 5 s pour obtenir une connexion
 * (sans limite par défaut avec `pg`), 5 min avant de fermer une connexion
 * inactive (10 s par défaut).
 *
 * @param {string} [url]
 * @param {Omit<import('@prisma/client').Prisma.PrismaClientOptions, 'adapter' | 'accelerateUrl'>} [options]
 * @returns {PrismaClient}
 */
export function createPrismaClient(url = process.env.DATABASE_URL, options = {}) {
	if (!url) throw new Error('DATABASE_URL absente : impossible de créer le client Prisma.');
	const { connectionString, schema } = connectionOf(url);
	const adapter = new PrismaPg(
		{ connectionString, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 300_000 },
		schema ? { schema } : undefined
	);
	return new PrismaClient({ ...options, adapter });
}
