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
		? '.svelte-kit-e2e'
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
				'https://*.ingest.sentry.io'
			],
			'frame-src': ['https://js.stripe.com', 'https://hooks.stripe.com'],
			'frame-ancestors': ['none'],
			'worker-src': ['self', 'blob:'],
			'report-uri': ['/api/csp-report']
		}
	}
};

export default config;
