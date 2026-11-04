// LINKMUSICIAN : lance la CLI Prisma sur une connexion DIRECTE à Neon.
//
// On ne colle qu'une ligne dans `.env` : `DATABASE_URL`, l'URL du pooler
// (`…-pooler.…neon.tech`). Les migrations ne doivent PAS passer par le pooler
// (PgBouncer en mode transaction) : il ne conserve pas le schéma d'une requête
// à l'autre et le transmet d'une connexion à la suivante. Constaté le
// 04/11/2026 : une migration « dev » s'est appliquée au schéma `e2e`. Ce script
// déduit l'URL directe (même URL sans `-pooler`) et l'utilise pour la commande.
//
//   node scripts/prisma-direct.mjs migrate deploy
//   E2E=1 node scripts/prisma-direct.mjs migrate deploy   (schéma e2e)
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import { directUrlOf } from './neon-url.mjs';

dotenv.config({ quiet: true });

const pooled = process.env.DATABASE_URL;
if (!pooled) {
	console.error('DATABASE_URL absente (.env).');
	process.exit(1);
}
const schema = process.env.E2E === '1' ? 'e2e' : undefined;
const direct = directUrlOf(pooled, schema);
const target = `${new URL(direct).hostname} (schéma ${schema ?? new URL(direct).searchParams.get('schema') ?? 'public'})`;
console.error(`[prisma-direct] connexion directe : ${target}`);

const result = spawnSync('npx', ['prisma', ...process.argv.slice(2)], {
	stdio: 'inherit',
	env: { ...process.env, DATABASE_URL: direct }
});
process.exit(result.status ?? 1);
