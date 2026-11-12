// LINKMUSICIAN : crée une migration à partir de l'écart entre la base de dev
// (connexion directe) et `prisma/schema.prisma`, puis la nettoie. Remplace
// `prisma migrate dev --create-only`, qui exige un terminal interactif et une
// base fantôme.
//
//   npm run db:nouvelle-migration -- <nom_en_snake_case>
// puis relire le SQL, `npm run db:deploy` et `npm run db:deploy:e2e`.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { directUrlOf } from './neon-url.mjs';
import { cleanMigrationSql } from './migration-clean.mjs';

dotenv.config({ quiet: true });
const name = process.argv[2];
if (!name || !/^[a-z0-9_]+$/.test(name)) {
	console.error('Usage : npm run db:nouvelle-migration -- <nom_en_snake_case>');
	process.exit(1);
}
const result = spawnSync(
	'npx',
	[
		'prisma',
		'migrate',
		'diff',
		// Prisma 7 (DT-01a) : la base vient de `prisma.config.ts`, qui lit
		// `DATABASE_URL` (ici l'URL directe).
		'--from-config-datasource',
		'--to-schema',
		'prisma/schema.prisma',
		'--script'
	],
	{
		env: { ...process.env, DATABASE_URL: directUrlOf(process.env.DATABASE_URL ?? '') },
		encoding: 'utf8'
	}
);
if (result.status !== 0) {
	console.error(result.stderr || result.stdout);
	process.exit(result.status ?? 1);
}
const { sql, removed } = cleanMigrationSql(result.stdout);
if (!/\b(CREATE|ALTER|DROP)\b/.test(sql)) {
	console.log('Aucun écart entre la base et le schéma : pas de migration.');
	process.exit(0);
}
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const dir = path.join('prisma/migrations', `${stamp}_${name}`);
fs.mkdirSync(dir);
fs.writeFileSync(path.join(dir, 'migration.sql'), sql);
console.log(
	`${dir}/migration.sql créé (${removed.length} ligne(s) du boilerplate retirée(s)). Relire, puis db:deploy.`
);
