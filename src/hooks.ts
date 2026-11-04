/**
 * LINKMUSICIAN: hooks universels (serveur et navigateur).
 *
 * `reroute` envoie les routes de la boutique vers un chemin qu'aucune route
 * ne sert quand `PUBLIC_SHOP_ENABLED` est coupé : SvelteKit répond alors un
 * 404 ordinaire, rendu par `+error.svelte`, y compris lors d'une navigation
 * côté client. Même mécanisme pour l'accueil : `/` sert alors la page
 * LinkMusician `/accueil` (connexion), sans toucher à `routes/+page.svelte`.
 * Ce fichier n'existe pas dans le boilerplate : aucune
 * modification de `hooks.server.ts` n'est nécessaire.
 */
import type { Reroute } from '@sveltejs/kit/hooks';
import { PUBLIC_SHOP_ENABLED } from '$app/env/public';
import { isShopPath, SHOP_DISABLED_PATH } from '#lib/shop/gate';

export const reroute: Reroute = ({ url }) => {
	if (PUBLIC_SHOP_ENABLED) return;
	if (isShopPath(url.pathname)) return SHOP_DISABLED_PATH;
	if (url.pathname === '/') return '/accueil';
};
