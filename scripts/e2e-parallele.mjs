// LINKMUSICIAN : la suite E2E en N parts isolées, lancées en même temps.
//
//   npm run test:e2e:parallele                      (nombre de parts selon la RAM)
//   npm run test:e2e:parallele -- --parts=4
//   npm run test:e2e:parallele -- --parts=3 e2e/linkmusician
//
// La suite reste mono-worker par part (serveur de dev, limiteurs en mémoire,
// boîte mail commune) : on la découpe plutôt (`--shard=i/N`), et chaque part a
// son serveur Vite (port), son puits SMTP, son schéma PostgreSQL (`e2e_<i>`,
// migré par la préparation globale) et ses dossiers générés (`E2E_SHARD`). Rien
// n'est partagé, donc rien ne se marche dessus. Les rapports « blob » sont
// fusionnés en un seul rapport HTML (`playwright-report/`).
//
// Le schéma `e2e` de `npm run test:e2e` n'est pas touché.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const GIB = 1024 ** 3;
/** Mesuré : un serveur Vite de dev, Chromium et Playwright, environ 3 Gio par part. */
const PER_PART = 3 * GIB;
const ROOT = 'e2e-parallele';

const args = process.argv.slice(2);
const partsArg = args.find((a) => a.startsWith('--parts='));
const passThrough = args.filter((a) => a !== partsArg);
const byMemory = Math.floor((os.freemem() - 2 * GIB) / PER_PART);
const parts = Math.max(1, Math.min(8, partsArg ? Number(partsArg.split('=')[1]) : byMemory));
if (!Number.isInteger(parts)) {
	console.error('--parts attend un entier, par exemple --parts=4.');
	process.exit(2);
}

fs.rmSync(ROOT, { recursive: true, force: true });
fs.mkdirSync(ROOT, { recursive: true });
console.log(
	`[e2e] ${parts} part(s) en parallèle (${(os.freemem() / GIB).toFixed(1)} Gio libres, ~3 Gio par part). Journaux : ${ROOT}/part-<n>.log`
);

const started = Date.now();
const children = [];

function runPart(i) {
	// Ports, SMTP et schéma (`e2e_<i>`) sont déduits de `E2E_SHARD` par
	// playwright.config.ts, après `.env.test`.
	const env = { ...process.env, E2E_SHARD: String(i) };
	const log = fs.createWriteStream(path.join(ROOT, `part-${i}.log`));
	const child = spawn('npx', ['playwright', 'test', `--shard=${i}/${parts}`, ...passThrough], {
		env,
		stdio: ['ignore', 'pipe', 'pipe']
	});
	children.push(child);
	const summary = [];
	let buffer = '';
	const onData = (chunk) => {
		log.write(chunk);
		buffer += chunk.toString();
		const lines = buffer.split(/\r?\n/);
		buffer = lines.pop() ?? '';
		for (const line of lines) {
			if (line.startsWith('[WebServer]')) continue;
			// Avancement, échecs, bilan : le reste est dans le journal de la part.
			if (/^\[\d+\/\d+\]/.test(line) || /^\s+\d+\) \[/.test(line))
				console.log(`[part ${i}] ${line.trim().slice(0, 180)}`);
			if (/^\s+\d+ (passed|failed|flaky|skipped|did not run|interrupted)/.test(line))
				summary.push(line.trim());
			if (/^\[e2e\]/.test(line)) console.log(`[part ${i}] ${line}`);
		}
	};
	child.stdout.on('data', onData);
	child.stderr.on('data', onData);
	return new Promise((resolve) =>
		child.on('close', (code) => {
			log.end();
			resolve({ i, code: code ?? 1, summary });
		})
	);
}

for (const signal of ['SIGINT', 'SIGTERM'])
	process.on(signal, () => {
		for (const c of children) c.kill(signal);
		process.exit(130);
	});

const results = await Promise.all(Array.from({ length: parts }, (_, k) => runPart(k + 1)));

console.log('\n[e2e] fusion des rapports…');
spawnSync('npx', ['playwright', 'merge-reports', '--reporter=html', `${ROOT}/blob`], {
	stdio: 'ignore',
	env: { ...process.env, PLAYWRIGHT_HTML_OPEN: 'never' }
});

const totals = {};
for (const r of results)
	for (const line of r.summary) {
		const [, n, kind] = line.match(/^(\d+) ([a-z ]+?)(?: \(|$)/) ?? [];
		if (n) totals[kind] = (totals[kind] ?? 0) + Number(n);
	}
console.log(`\n[e2e] bilan en ${Math.round((Date.now() - started) / 60000)} min :`);
for (const r of results)
	console.log(`  part ${r.i} : ${r.summary.join(' · ') || 'aucun bilan'} (code ${r.code})`);
console.log(
	`  total : ${Object.entries(totals)
		.map(([k, n]) => `${n} ${k}`)
		.join(' · ')}`
);
console.log('  rapport : npx playwright show-report');
process.exit(results.some((r) => r.code !== 0) ? 1 : 0);
