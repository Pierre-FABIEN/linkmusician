import { defineConfig, devices } from '@playwright/test';
import dns from 'node:dns';
import dotenv from 'dotenv';
import fs from 'node:fs'; // LINKMUSICIAN:

// Neon ne publie que des AAAA en premier, et l'IPv6 de WSL2 vers AWS coupe par
// intermittence : la base devenait injoignable au milieu d'un run. On privilégie
// donc l'IPv4, ici pour le process Playwright et plus bas pour le serveur.
dns.setDefaultResultOrder('ipv4first');

// `.env.test` prime sur `.env` : la suite travaille sur le schéma PostgreSQL
// `e2e` et sur le puits SMTP local, jamais sur les données de développement.
dotenv.config({ path: '.env.test', override: true });

// LINKMUSICIAN ▼ une part de `npm run test:e2e:parallele` (scripts/e2e-parallele.mjs) :
// ports, puits SMTP et schéma propres, posés APRÈS `.env.test` qui fixe
// `SMTP_PORT`. Le serveur de dev hérite de ces valeurs (`webServer.env`).
const SHARD = process.env.E2E_SHARD;
if (SHARD) {
	const n = Number(SHARD);
	process.env.E2E_PORT = String(2010 + n);
	process.env.SMTP_PORT = String(2600 + 2 * n);
	process.env.SMTP_HTTP_PORT = String(2601 + 2 * n);
	// `E2E_SCHEMA_PREFIX` (ex. `e2e_portable`) : deux machines sur la même base
	// Neon ne partagent pas leurs schémas.
	process.env.E2E_DB_SCHEMA = `${process.env.E2E_SCHEMA_PREFIX ?? 'e2e'}_${n}`;
}
// LINKMUSICIAN ▲

// LINKMUSICIAN ▼ base e2e déduite de `.env`, pour n'avoir qu'un endroit où
// coller l'URL fournie par Neon. Si `.env.test` ne définit pas
// `DATABASE_URL` (ni `DIRECT_URL`, plus utilisée), on reprend celles de `.env` en ajoutant
// `schema=e2e` (ou `E2E_DB_SCHEMA`). Une URL qui porte déjà un `schema=` est
// laissée telle quelle : `.env.test` peut toujours viser une autre base.
{
	const devEnv = fs.existsSync('.env') ? dotenv.parse(fs.readFileSync('.env')) : {};
	const e2eSchema = process.env.E2E_DB_SCHEMA ?? 'e2e';
	for (const key of ['DATABASE_URL', 'DIRECT_URL'] as const) {
		const raw = process.env[key] ?? devEnv[key];
		if (!raw) continue;
		const url = new URL(raw);
		if (!url.searchParams.has('schema')) url.searchParams.set('schema', e2eSchema);
		if (url.searchParams.get('schema') === 'public') {
			throw new Error(
				`${key} des e2e vise le schéma public : les données de dev seraient effacées.`
			);
		}
		process.env[key] = url.toString();
	}
}
// LINKMUSICIAN ▲

// Port distinct de `npm run dev` (2000) : les e2e ne tuent plus le serveur
// de développement. La suite garde `.env.test` (schéma `e2e`, SMTP local).
const PORT = Number(process.env.E2E_PORT ?? 2001);

export default defineConfig({
	testDir: 'e2e',
	globalSetup: './e2e/support/global-setup.ts',

	// Les parcours enchaînent plusieurs redirections et des écritures sur une base
	// distante : les délais par défaut sont trop courts.
	timeout: 90_000,
	expect: { timeout: 15_000 },

	// Un seul worker : le serveur de dev est mono-processus et les limiteurs de
	// débit vivent en mémoire. L'isolation repose sur un compte et une IP uniques
	// par test plutôt que sur le parallélisme.
	fullyParallel: false,
	workers: 1,
	// Une reprise même en local : la base est distante, et une coupure réseau
	// passagère ne doit pas se lire comme une régression.
	retries: 1,
	forbidOnly: !!process.env.CI,
	// En local, `step-reporter` commente l'avancement en direct : le parcours est
	// un test unique de plusieurs minutes, sinon la console reste muette.
	reporter: SHARD
		? [['line'], ['blob', { outputDir: 'e2e-parallele/blob', fileName: `part-${SHARD}.zip` }]]
		: process.env.CI
			? [['github'], ['html', { open: 'never' }]]
			: [['list'], ['./e2e/support/step-reporter.ts'], ['html', { open: 'never' }]],
	...(SHARD ? { outputDir: `e2e-parallele/resultats-${SHARD}` } : {}),

	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',

		// Sans ces bornes, un geste qui n'aboutit pas consomme le délai du test
		// entier — soit plusieurs minutes de silence avant de savoir ce qui a
		// bloqué. Le serveur de dev compile à la demande, d'où une navigation
		// volontairement large.
		actionTimeout: 20_000,
		navigationTimeout: 60_000,

		// Par défaut on ne garde la vidéo que des échecs, pour ne pas alourdir
		// chaque exécution. `E2E_VIDEO=1` enregistre tous les parcours.
		video: process.env.E2E_VIDEO
			? { mode: 'on', size: { width: 1280, height: 720 } }
			: 'retain-on-failure',
		viewport: { width: 1280, height: 720 }
	},

	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

	webServer: {
		// Serveur de développement plutôt que `build && preview` : démarrage plus
		// court, et cookies de session non marqués `Secure`, donc utilisables en
		// clair sur localhost.
		command: `npx vite dev --port ${PORT} --strictPort`,
		port: PORT,
		// En local, réutiliser un Vite déjà sur 2001 (crash / run précédent).
		// Jamais le `npm run dev` du port 2000 : ce n'est pas `.env.test`.
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		stdout: 'pipe',
		stderr: 'pipe',
		env: {
			...(process.env as Record<string, string>),
			NODE_ENV: 'development',
			E2E_SERVER: '1', // LINKMUSICIAN: dossiers générés et cache séparés (sveltekit.config.ts)
			NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --dns-result-order=ipv4first`.trim()
		}
	}
});
