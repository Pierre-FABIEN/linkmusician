import adapter from '@sveltejs/adapter-vercel';
import type { Config } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// LINKMUSICIAN ▼ un dossier généré par usage. Vitest (mode `test`, donc
// `.env.test`) et le Vite des e2e (`.env.test` via Playwright) réécrivaient
// `.svelte-kit/generated/dev/env` avec leurs valeurs (`PUBLIC_SHOP_ENABLED=true`,
// clés factices) pendant que `npm run dev` tournait : la boutique réapparaissait
// et les redirections changeaient. Même séparation pour le cache Vite
// (`vite.config.ts`). À proposer en amont.
export const KIT_OUT_DIR = process.env.VITEST
	? '.svelte-kit-vitest'
	: process.env.E2E_SERVER
		? // Chaque part de `test:e2e:parallele` a son dossier (`E2E_SHARD`).
			`.svelte-kit-e2e${process.env.E2E_SHARD ? `-${process.env.E2E_SHARD}` : ''}`
		: '.svelte-kit';
// LINKMUSICIAN ▲

const config: Config = {
	preprocess: vitePreprocess(),
	outDir: KIT_OUT_DIR, // LINKMUSICIAN:

	adapter: adapter({
		runtime: 'nodejs22.x',
		memory: 1024,
		maxDuration: 30
	}),

	// LINKMUSICIAN: service worker enregistré à la main, en production seulement
	// (`#lib/linkmusician/pwa`) : en dev, `hooks.client.ts` retire les workers
	// d'autres projets partageant localhost, un enregistrement auto bouclerait.
	serviceWorker: { register: false },

	// Static source review was used to build this policy. Smoke-test Stripe,
	// TinyMCE, TOTP setup and the Sendcloud service-point map after deployment.
	csp: {
		mode: 'auto',
		directives: {
			'default-src': ['self'],
			'script-src': ['self', 'https://js.stripe.com'],
			'style-src': ['self', 'unsafe-inline'],
			'img-src': [
				'self',
				'data:',
				'blob:',
				'https://res.cloudinary.com',
				'https://tiles.basemaps.cartocdn.com'
			],
			'connect-src': [
				'self',
				'https://api.stripe.com',
				'https://tiles.basemaps.cartocdn.com',
				'https://*.ingest.sentry.io',
				// LINKMUSICIAN: envoi direct des médias (P1-08b)
				'https://api.cloudinary.com'
			],
			// LINKMUSICIAN: lecture des médias audio et vidéo (P1-08b)
			'media-src': ['self', 'https://res.cloudinary.com'],
			'frame-src': [
				'https://js.stripe.com',
				'https://hooks.stripe.com',
				// LINKMUSICIAN: lecteurs des médias externes (P1-08)
				'https://www.youtube-nocookie.com',
				'https://w.soundcloud.com'
			],
			'frame-ancestors': ['none'],
			'worker-src': ['self', 'blob:'],
			'report-uri': ['/api/csp-report']
		}
	}
};

export default config;
