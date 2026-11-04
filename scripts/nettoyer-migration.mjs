// LINKMUSICIAN : retire d'une migration générée les lignes qui touchent aux
// index du boilerplate (voir CLAUDE.md). Sans argument : la migration la plus
// récente.
//
//   npm run db:nettoyer-migration [-- prisma/migrations/<dossier>]
import fs from 'node:fs';
import path from 'node:path';
import { cleanMigrationSql } from './migration-clean.mjs';

const dir =
	process.argv[2] ??
	path.join(
		'prisma/migrations',
		fs
			.readdirSync('prisma/migrations')
			.filter((d) => /^\d{14}_/.test(d))
			.sort()
			.at(-1)
	);
const file = path.join(dir, 'migration.sql');
const { sql, removed } = cleanMigrationSql(fs.readFileSync(file, 'utf8'));
fs.writeFileSync(file, sql);
console.log(`${file} : ${removed.length} ligne(s) retirée(s).`);
for (const line of removed) console.log(`  - ${line}`);
