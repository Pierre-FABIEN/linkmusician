/**
 * LINKMUSICIAN: synchronisation de Melokiva Diagram avec le dépôt (DIAGRAM-06).
 *
 * Produit, de façon déterministe (aucune date, ordre stable) :
 * - `src/lib/server/diagram/generated/references.json` : ce qui existe
 *   réellement (fichiers, services, modèles, décisions, déclencheurs) ;
 * - `docs/diagram/inventaire.md` et `docs/diagram/coverage.md`, générés
 *   depuis le catalogue : jamais édités à la main.
 *
 * `npm run diagram:sync` écrit ; le test `sync.test.ts` échoue si un fichier
 * écrit n'est plus à jour. Node seulement (lecture de fichiers).
 */
import { readFileSync } from 'node:fs';
import prettier from 'prettier';
import {
	ACTORS,
	DIAGRAMS,
	DOMAINS,
	KIND_LABELS,
	PROBLEM_LABELS,
	PROCESSES,
	STATUS_LABELS,
	controls,
	coverage,
	documentedProcessIds,
	loadModels,
	stepsOfProcess,
	type ReferenceData
} from './catalog';
import { outOfScope } from './inventory';
import { decisions, fileExists, prismaModels, scanRoutes, serviceExists } from './scan';
import type { ProcessEntry } from './types';

export const GENERATED = {
	references: 'src/lib/server/diagram/generated/references.json',
	inventory: 'docs/diagram/inventaire.md',
	coverage: 'docs/diagram/coverage.md'
} as const;

const sorted = (values: Iterable<string>) =>
	[...new Set(values)].sort((a, b) => a.localeCompare(b));

const triggerKey = (route: string, kind: 'action' | 'endpoint', name: string) =>
	`${kind === 'action' ? 'action' : 'endpoint'} ${route} ${name}`;

function processKey(p: ProcessEntry): string | null {
	const t = p.trigger;
	if (t.kind === 'action') return triggerKey(t.route, 'action', t.name);
	if (t.kind === 'endpoint' || t.kind === 'job') return triggerKey(t.route, 'endpoint', t.method);
	return null;
}

/** Relit le dépôt : existence de chaque référence et couverture du code. */
export function computeReferences(): ReferenceData {
	const files = sorted([
		...PROCESSES.flatMap((p) => [
			...p.references.sourceFiles,
			...p.references.tests,
			...p.references.docs
		]),
		...DIAGRAMS.flatMap((d) => [
			d.source,
			...d.references.sourceFiles,
			...d.references.tests,
			...d.references.docs,
			...d.steps.flatMap((s) => [
				...s.references.sourceFiles,
				...s.references.tests,
				...s.references.docs
			])
		])
	]);
	const services = sorted(PROCESSES.flatMap((p) => p.services));
	const registry = decisions();
	const cited = sorted([
		...PROCESSES.flatMap((p) => p.references.decisions),
		...DIAGRAMS.flatMap((d) => [
			...d.references.decisions,
			...d.steps.flatMap((s) => s.references.decisions)
		])
	]);
	const scanned = scanRoutes();
	const inventoried = new Set(PROCESSES.map(processKey).filter((k): k is string => k !== null));
	const inScope = scanned.filter((s) => !outOfScope(s.route));
	const missing = inScope
		.map((s) => triggerKey(s.route, s.kind, s.name))
		.filter((k) => !inventoried.has(k))
		.sort();
	return {
		files: Object.fromEntries(files.map((f) => [f, fileExists(f)])),
		services: Object.fromEntries(services.map((s) => [s, serviceExists(s)])),
		models: sorted(prismaModels()),
		decisions: Object.fromEntries(
			cited.filter((id) => registry[id]).map((id) => [id, registry[id]])
		),
		code: {
			triggers: scanned.length,
			inventoried: inScope.length - missing.length,
			outOfScope: scanned.length - inScope.length,
			missing
		}
	};
}

/** Clés de déclencheurs inventoriés absents du code (inventaire périmé). */
export function staleInventory(): string[] {
	const scanned = new Set(scanRoutes().map((s) => triggerKey(s.route, s.kind, s.name)));
	return PROCESSES.map(processKey)
		.filter((k): k is string => k !== null && !scanned.has(k))
		.sort();
}

const esc = (s: string) => s.replace(/\|/g, '\\|');

function triggerText(p: ProcessEntry) {
	const t = p.trigger;
	if (t.kind === 'action') return `\`${t.route}\` · \`?/${t.name}\``;
	if (t.kind === 'endpoint' || t.kind === 'job') return `\`${t.method} ${t.route}\``;
	if (t.kind === 'load') return `\`load ${t.route}\``;
	return 'Documentation';
}

const actorLabel = new Map(ACTORS.map((a) => [a.id, a.label]));

export function inventoryMarkdown(data: ReferenceData): string {
	const documented = documentedProcessIds();
	const lines: string[] = [
		'# Inventaire des processus de Melokiva',
		'',
		'> **Fichier généré** par `npm run diagram:sync` depuis',
		'> `src/lib/server/diagram/inventory/`. Ne pas l’éditer à la main : le test',
		'> `sync.test.ts` échoue s’il n’est plus à jour.',
		'',
		`- **${PROCESSES.length} processus** inventoriés, dont ${PROCESSES.filter((p) => p.provenance === 'code').length} relevés dans le code.`,
		`- **Code relu** : ${data.code.triggers} déclencheurs (actions de formulaire et méthodes d’endpoints), ${data.code.inventoried} inventoriés, ${data.code.outOfScope} hors périmètre (boutique en veille D6, laboratoire, Diagram), **${data.code.missing.length} manquant(s)**.`,
		`- **${documented.size} processus documentés** par au moins une étape de diagramme.`,
		'',
		'Statut : `TESTED` = une spec ou une intégration exerce la route ou son service',
		'(référence vérifiée, exécution non rejouée par la synchronisation) ;',
		'`IMPLEMENTED` = code présent sans test référencé ; `DESIGNED`, `PLANNED`,',
		'`DEPRECATED` = provenance documentaire.',
		''
	];
	if (data.code.missing.length > 0) {
		lines.push(
			'## Déclencheurs du code non inventoriés',
			'',
			...data.code.missing.map((m) => `- \`${m}\``),
			''
		);
	}
	for (const d of DOMAINS) {
		const list = PROCESSES.filter((p) => p.domain === d.id);
		if (list.length === 0) continue;
		lines.push(
			`## ${d.label} (${list.length})`,
			'',
			d.description,
			'',
			'| Processus | Déclencheur | Acteurs | Entités | Statut | Diagramme |',
			'| --- | --- | --- | --- | --- | --- |'
		);
		for (const p of list) {
			const diagrams = sorted(stepsOfProcess(p.id).map((s) => s.diagram.id));
			lines.push(
				`| ${esc(p.title)} <br>\`${p.id}\` | ${triggerText(p)} | ${p.actors.map((a) => actorLabel.get(a) ?? a).join(', ')} | ${p.entities.join(', ') || '—'} | ${STATUS_LABELS[p.status]} | ${diagrams.join(', ') || 'à construire'} |`
			);
		}
		lines.push('');
	}
	return `${lines.join('\n')}\n`;
}

export async function coverageMarkdown(data: ReferenceData): Promise<string> {
	const models = await loadModels(
		DIAGRAMS.map((d) => d.id),
		async (source) => (fileExists(source) ? readFileSync(source, 'utf8') : null)
	);
	const rows = coverage(data);
	const problems = controls(data, models);
	const total = rows.reduce(
		(acc, r) => ({
			processes: acc.processes + r.processes,
			implemented: acc.implemented + r.implemented,
			documented: acc.documented + r.documented,
			verified: acc.verified + r.verified
		}),
		{ processes: 0, implemented: 0, documented: 0, verified: 0 }
	);
	const lines = [
		'# Couverture documentaire de Melokiva Diagram',
		'',
		'> **Fichier généré** par `npm run diagram:sync`. Les chiffres viennent de',
		'> l’inventaire réel ; ils mesurent la documentation, pas la qualité du code.',
		'',
		`**Total** : ${total.processes} processus, ${total.implemented} implémentés, ${total.documented} documentés par un diagramme, ${total.verified} aux références toutes vérifiées. **${DIAGRAMS.length} diagrammes**.`,
		'',
		'| Domaine | Inventoriés | Implémentés | Testés | Conçus ou prévus | Documentés | Références vérifiées | Diagrammes |',
		'| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
		...rows.map(
			(r) =>
				`| ${r.label} | ${r.processes} | ${r.implemented} | ${r.tested} | ${r.planned} | ${r.documented} / ${r.implemented} | ${r.verified} / ${r.documented} | ${r.diagrams} |`
		),
		'',
		'## Diagrammes',
		'',
		'| Diagramme | Type | Domaine | Étapes | Statut |',
		'| --- | --- | --- | ---: | --- |',
		...DIAGRAMS.map(
			(d) =>
				`| ${esc(d.title)} (\`${d.id}\`) | ${KIND_LABELS[d.kind]} | ${d.domain} | ${d.steps.length} | ${STATUS_LABELS[d.status]} |`
		),
		'',
		'## Contrôles',
		''
	];
	for (const [kind, label] of Object.entries(PROBLEM_LABELS)) {
		const list = problems.filter((p) => p.kind === kind);
		lines.push(`- **${label}** : ${list.length}`);
		if (list.length > 0 && list.length <= 12) {
			for (const p of list) lines.push(`  - \`${p.subject}\` — ${esc(p.message)}`);
		}
	}
	lines.push('');
	return `${lines.join('\n')}\n`;
}

/** Formatage Prettier du dépôt : un fichier généré passe `npm run lint` tel quel. */
async function formatted(filepath: string, content: string) {
	const options = (await prettier.resolveConfig(filepath)) ?? {};
	return prettier.format(content, { ...options, filepath, plugins: [] });
}

/** Les trois fichiers générés, avec leur contenu attendu. */
export async function generatedFiles(): Promise<Record<string, string>> {
	const data = computeReferences();
	const raw: Record<string, string> = {
		[GENERATED.references]: JSON.stringify(data),
		[GENERATED.inventory]: inventoryMarkdown(data),
		[GENERATED.coverage]: await coverageMarkdown(data)
	};
	const out: Record<string, string> = {};
	for (const [path, content] of Object.entries(raw)) out[path] = await formatted(path, content);
	return out;
}
