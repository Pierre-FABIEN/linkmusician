// LINKMUSICIAN : retire d'une migration générée par `prisma migrate dev` les
// lignes qui touchent aux index du boilerplate créés en SQL brut et absents de
// `schema.prisma` (voir CLAUDE.md). Sans argument : la migration la plus récente.
//
//   npm run db:nettoyer-migration [-- prisma/migrations/<dossier>]
import fs from 'node:fs';
import path from 'node:path';

const BOILERPLATE_INDEXES = [
	'transactions_createdAt_idx',
	'transactions_orderId_idx',
	'transactions_userId_idx',
	'blog_posts_published_createdAt_idx'
];

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
const original = fs.readFileSync(file, 'utf8');
let sql = original;
const removed = [];
for (const name of BOILERPLATE_INDEXES) {
	const pattern = new RegExp(
		`(--\\s*(?:DropIndex|CreateIndex)\\s*\\n)?\\s*(?:DROP INDEX|CREATE INDEX)\\s+"${name}"[^;]*;[ \\t]*\\n?`,
		'g'
	);
	sql = sql.replace(pattern, (match) => {
		removed.push(match.trim().split('\n').at(-1));
		return '\n';
	});
}
sql = sql.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '');
if (removed.length > 0 && !sql.includes('retirées à la main')) {
	sql = `-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/nettoyer-migration.mjs, voir CLAUDE.md).\n\n${sql}`;
}
fs.writeFileSync(file, sql);
console.log(`${file} : ${removed.length} ligne(s) retirée(s).`);
for (const line of removed) console.log(`  - ${line}`);
