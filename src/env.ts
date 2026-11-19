import { defineEnvVars } from '@sveltejs/kit/env';
// LINKMUSICIAN: interrupteur global de la boutique, voir src/lib/shop/gate.ts.
import { parseShopEnabled } from './lib/shop/gate.ts';

export const variables = defineEnvVars({
	DATABASE_URL: {},
	BETTER_AUTH_SECRET: { static: true },
	GOOGLE_CLIENT_ID: { static: true },
	GOOGLE_CLIENT_SECRET: { static: true },
	PUBLIC_TINYMCE_API_KEY: { public: true, static: true },
	SECRET_ADDRESS_SEARCH_MODE: { static: true },
	// Lus à l'exécution (pas `static`) : mêmes sémantiques que les anciens
	// `$env/dynamic/private`/`$env/dynamic/public` qu'ils remplacent — absents
	// en local sans configuration supplémentaire (voir isValidSentryDsn).
	// `schema` les déclare optionnels (sans lui, `defineEnvVars` exige une
	// valeur, même vide) : `undefined` reste un résultat valide.
	SENTRY_DSN: { schema: (value: string | undefined) => value },
	PUBLIC_SENTRY_DSN: { public: true, schema: (value: string | undefined) => value },
	STRIPE_SECRET_KEY: {},
	// LINKMUSICIAN: absente = `false`, la boutique est en veille (`src/hooks.ts`).
	PUBLIC_SHOP_ENABLED: { public: true, schema: parseShopEnabled },
	// LINKMUSICIAN: Melokiva Diagram (D80, src/lib/server/diagram/access.ts),
	// optionnelles : comptes autorisés en plus des ADMIN, ouverture temporaire (Q110).
	DIAGRAM_READER_IDS: { schema: (value: string | undefined) => value },
	DIAGRAM_PUBLIC: { schema: (value: string | undefined) => value }
});
