/**
 * LINKMUSICIAN: point d'arrivée de l'application.
 *
 * Boutique en veille (`PUBLIC_SHOP_ENABLED` coupé, le mode LinkMusician) : une
 * étape d'authentification réussie mène à l'espace, qui oriente ensuite vers
 * `/bienvenue` ou `/qui-es-tu` s'il manque quelque chose. Boutique active (la
 * suite e2e du boilerplate) : les destinations d'origine sont conservées.
 */
import { PUBLIC_SHOP_ENABLED } from '$app/env/public';

/** Accueil de l'espace : le menu du jeu, carrière ou jam (P2-12). */
export const APP_HOME = '/jouer';

/** Destination après une étape d'authentification ; `boilerplatePath` est celle d'origine. */
export function afterAuthPath(boilerplatePath: string): string {
	return PUBLIC_SHOP_ENABLED ? boilerplatePath : APP_HOME;
}
