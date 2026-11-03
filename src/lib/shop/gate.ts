/**
 * Interrupteur global de la boutique (vitrine, panier, checkout).
 *
 * Quand `PUBLIC_SHOP_ENABLED` est coupé (valeur par défaut), la boutique est
 * « en veille » : son code, ses tests et ses données restent intacts, mais
 * ses points d'entrée publics répondent 404 (voir `src/hooks.ts`) et ses
 * liens disparaissent de l'interface.
 *
 * Module pur, sans dépendance : utilisable côté serveur, côté client et
 * dans les tests. Écrit de façon générique pour pouvoir être proposé au
 * boilerplate amont.
 */

/** Pages publiques de la boutique. */
export const SHOP_PAGE_PREFIXES = ['/products', '/checkout', '/suivi-commande', '/cgv'] as const;

/**
 * API appelées par la vitrine et le panier. Les webhooks (`/api/webhooks`,
 * `/api/sendcloud`) restent ouverts : ils sont signés et inoffensifs sans
 * commande, et les couper ferait perdre un événement tardif.
 */
export const SHOP_API_PREFIXES = [
	'/api/save-cart',
	'/api/wishlist',
	'/api/promo',
	'/api/gift-cards',
	'/api/stock-alerts',
	'/api/bundles'
] as const;

/**
 * Entrées du back-office propres à la boutique : masquées du menu quand la
 * boutique est coupée, mais **pas bloquées**, pour que l'admin puisse
 * consulter l'historique ou préparer une réactivation.
 */
export const SHOP_ADMIN_PREFIXES = [
	'/admin/sales',
	'/admin/products',
	'/admin/promo',
	'/admin/gift-cards',
	'/admin/returns',
	'/admin/fraud',
	'/admin/tva',
	'/admin/livraison'
] as const;

/** Chemin vers lequel `reroute` envoie une route coupée : aucune route ne le sert, d'où un 404. */
export const SHOP_DISABLED_PATH = '/__boutique-en-veille';

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
	return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

/** Vrai si le chemin appartient à la boutique publique (pages ou API). */
export function isShopPath(pathname: string): boolean {
	return matchesPrefix(pathname, SHOP_PAGE_PREFIXES) || matchesPrefix(pathname, SHOP_API_PREFIXES);
}

/** Vrai si l'URL (lien de menu, entrée de sitemap…) pointe vers la boutique, admin compris. */
export function isShopHref(href: string): boolean {
	const pathname = href.split(/[?#]/, 1)[0];
	return isShopPath(pathname) || matchesPrefix(pathname, SHOP_ADMIN_PREFIXES);
}

/**
 * Interprète la variable d'environnement. Absente ou vide → `false` (boutique
 * en veille). Toute autre valeur que vrai/faux est une erreur de
 * configuration, signalée au démarrage plutôt qu'ignorée.
 */
export function parseShopEnabled(value: string | undefined): boolean {
	const v = value?.trim().toLowerCase();
	if (!v) return false;
	if (['true', '1', 'yes', 'on'].includes(v)) return true;
	if (['false', '0', 'no', 'off'].includes(v)) return false;
	throw new Error(`PUBLIC_SHOP_ENABLED invalide : « ${value} » (attendu true ou false)`);
}

/** Retire les liens de boutique d'une liste quand la boutique est coupée. */
export function withoutShopLinks<T extends { href?: string; url?: string }>(
	links: readonly T[],
	shopEnabled: boolean
): T[] {
	if (shopEnabled) return [...links];
	return links.filter((link) => !isShopHref(link.href ?? link.url ?? ''));
}
