// LINKMUSICIAN : retrait des lignes d'index du boilerplate dans le SQL d'une
// migration générée (index créés en SQL brut, absents de schema.prisma).

export const BOILERPLATE_INDEXES = [
	'transactions_createdAt_idx',
	'transactions_orderId_idx',
	'transactions_userId_idx',
	'blog_posts_published_createdAt_idx'
];

/**
 * @param {string} sql
 * @returns {{ sql: string, removed: string[] }}
 */
export function cleanMigrationSql(sql) {
	const removed = [];
	let out = sql;
	for (const name of BOILERPLATE_INDEXES) {
		const pattern = new RegExp(
			`(--\\s*(?:DropIndex|CreateIndex)\\s*\\n)?\\s*(?:DROP INDEX|CREATE INDEX)\\s+"${name}"[^;]*;[ \\t]*\\n?`,
			'g'
		);
		out = out.replace(pattern, (match) => {
			removed.push(match.trim().split('\n').at(-1));
			return '\n';
		});
	}
	out = out.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '');
	if (removed.length > 0 && !out.includes('retirées')) {
		out = `-- Lignes d'index du boilerplate générées par Prisma retirées (scripts/migration-clean.mjs, voir CLAUDE.md).\n\n${out}`;
	}
	return { sql: out, removed };
}
