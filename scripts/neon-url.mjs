// LINKMUSICIAN : URL directe Neon déduite de l'URL du pooler (voir
// scripts/prisma-direct.mjs). Module sans effet de bord, réutilisé par la
// préparation des e2e.

/**
 * URL directe (sans `-pooler`), avec un schéma éventuel.
 * @param {string} pooled
 * @param {string} [schema]
 * @returns {string}
 */
export function directUrlOf(pooled, schema) {
	const url = new URL(pooled);
	url.hostname = url.hostname.replace('-pooler.', '.');
	if (schema) url.searchParams.set('schema', schema);
	return url.toString();
}
