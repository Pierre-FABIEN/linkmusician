// LINKMUSICIAN (DIAGRAM-06) : synchronise Melokiva Diagram avec le dépôt.
// Relit les routes, le schéma Prisma, le registre des décisions et chaque
// référence du catalogue, puis réécrit les fichiers générés :
//   src/lib/server/diagram/generated/references.json
//   docs/diagram/inventaire.md
//   docs/diagram/coverage.md
//
//   npm run diagram:sync           écrit les fichiers
//   npm run diagram:sync -- --check  échoue si un fichier n'est plus à jour
import { readFileSync, writeFileSync } from 'node:fs';
import { generatedFiles, staleInventory } from '../../src/lib/server/diagram/report';

const check = process.argv.includes('--check');
const files = await generatedFiles();
let outdated = 0;
for (const [path, content] of Object.entries(files)) {
	let current = '';
	try {
		current = readFileSync(path, 'utf8');
	} catch {
		current = '';
	}
	if (current === content) continue;
	outdated += 1;
	if (check) console.error(`Pas à jour : ${path}`);
	else {
		writeFileSync(path, content);
		console.log(`Écrit : ${path}`);
	}
}
const references = JSON.parse(files['src/lib/server/diagram/generated/references.json']);
const stale = staleInventory();
console.log(
	`Déclencheurs du code : ${references.code.triggers}, inventoriés ${references.code.inventoried}, hors périmètre ${references.code.outOfScope}, manquants ${references.code.missing.length}.`
);
for (const m of references.code.missing) console.error(`Non inventorié : ${m}`);
for (const s of stale) console.error(`Inventorié mais absent du code : ${s}`);
if ((check && outdated > 0) || references.code.missing.length > 0 || stale.length > 0) {
	process.exitCode = 1;
}
