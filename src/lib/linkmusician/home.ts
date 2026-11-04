/**
 * LINKMUSICIAN: point d'arrivée de l'application.
 *
 * Boutique en veille (`PUBLIC_SHOP_ENABLED` coupé, le mode LinkMusician) : une
 * étape d'authentification réussie mène à l'espace, qui oriente ensuite vers
 * `/bienvenue` ou `/qui-es-tu` s'il manque quelque chose. Boutique active (la
 * suite e2e du boilerplate) : les destinations d'origine sont conservées.
 */
import { PUBLIC_SHOP_ENABLED } from '$app/env/public';

export const APP_HOME = '/espace';

/** Destination après une étape d'authentification ; `boilerplatePath` est celle d'origine. */
export function afterAuthPath(boilerplatePath: string): string {
	return PUBLIC_SHOP_ENABLED ? boilerplatePath : APP_HOME;
}
