/**
 * LINKMUSICIAN: catalogue Melokiva Diagram (DIAGRAM-01 à DIAGRAM-03).
 *
 * Assemble l'inventaire, les diagrammes et les références vérifiées
 * (`generated/references.json`, produit par `npm run diagram:sync`) en vues
 * de lecture : menu, recherche, index inverses, couverture et contrôles.
 * Pur : aucune lecture de fichier ici ; les sources `.drawio` sont passées
 * par l'appelant, ce qui garde ce module testable et sans `$app/*`.
 */
import { DIAGRAMS } from './diagrams';
import { parseDrawio } from './drawio';
import { PROCESSES, processById } from './inventory';
import { ACTORS, DOMAINS, actorById, domainById } from './taxonomy';
import {
	KIND_LABELS,
	STATUS_LABELS,
	type DeliveryStatus,
	type DiagramDefinition,
	type DiagramKind,
	type DiagramStep,
	type DrawioModel,
	type ProcessEntry,
	type References
} from '#lib/diagram/types';

export interface DecisionRef {
	id: string;
	title: string;
	status: 'ACCEPTED' | 'PROPOSED' | 'REJECTED' | 'REPLACED' | 'UNKNOWN';
	label: string;
}

/** Ce que la synchronisation a vérifié dans le dépôt. */
export interface ReferenceData {
	files: Record<string, boolean>;
	services: Record<string, boolean>;
	models: string[];
	decisions: Record<string, DecisionRef>;
	code: {
		triggers: number;
		inventoried: number;
		outOfScope: number;
		missing: string[];
	};
}

export const diagramById = new Map(DIAGRAMS.map((d) => [d.id, d]));
export const diagramBySlug = new Map(DIAGRAMS.map((d) => [d.slug, d]));

// ── Index inverses ──────────────────────────────────────────────────────────

export interface StepRef {
	diagram: DiagramDefinition;
	step: DiagramStep;
}

const allSteps: StepRef[] = DIAGRAMS.flatMap((diagram) =>
	diagram.steps.map((step) => ({ diagram, step }))
);

/** Étapes qui documentent un processus de l'inventaire. */
export function stepsOfProcess(processId: string): StepRef[] {
	return allSteps.filter((s) => s.step.process === processId);
}

export const documentedProcessIds = () =>
	new Set(allSteps.map((s) => s.step.process).filter((p): p is string => Boolean(p)));

/** Tout ce qui touche une entité Prisma : processus, diagrammes, étapes. */
export function usesOfEntity(entity: string) {
	const processes = PROCESSES.filter((p) => p.entities.includes(entity));
	const diagrams = DIAGRAMS.filter((d) => d.entities.includes(entity));
	const steps = allSteps.filter(
		(s) => s.step.reads.includes(entity) || s.step.writes.includes(entity)
	);
	return { processes, diagrams, steps };
}

export function entitiesInUse(): { name: string; processes: number; diagrams: number }[] {
	const names = new Set([
		...PROCESSES.flatMap((p) => p.entities),
		...DIAGRAMS.flatMap((d) => d.entities),
		...allSteps.flatMap((s) => [...s.step.reads, ...s.step.writes])
	]);
	return [...names]
		.sort((a, b) => a.localeCompare(b))
		.map((name) => {
			const u = usesOfEntity(name);
			return { name, processes: u.processes.length, diagrams: u.diagrams.length };
		});
}

export const processesOfActor = (actor: string) =>
	PROCESSES.filter((p) => p.actors.includes(actor));
export const diagramsOfActor = (actor: string) =>
	DIAGRAMS.filter((d) => d.actors.includes(actor) || d.steps.some((s) => s.actor === actor));
export const processesOfDomain = (domain: string) => PROCESSES.filter((p) => p.domain === domain);
export const diagramsOfDomain = (domain: string) => DIAGRAMS.filter((d) => d.domain === domain);

/** Diagrammes qui citent ce diagramme (navigation inverse). */
export const diagramsLinkingTo = (id: string) =>
	DIAGRAMS.filter(
		(d) =>
			d.id !== id && (d.children.includes(id) || d.related.includes(id) || d.parents.includes(id))
	);

// ── Menu ────────────────────────────────────────────────────────────────────

/** Vues transversales du menu (§3 de la mission), chacune une page. */
export const VIEWS = [
	{ id: 'parcours', label: 'Parcours complets', kinds: ['parcours', 'couloirs'] },
	{ id: 'dataflows', label: 'Dataflows', kinds: ['dataflow'] },
	{ id: 'permissions', label: 'Permissions', kinds: ['permissions'] },
	{ id: 'donnees', label: 'Modèles de données', kinds: ['donnees'] },
	{ id: 'etats', label: 'Machines à états', kinds: ['etats'] },
	{ id: 'evenements', label: 'Événements et progression', kinds: [] },
	{ id: 'evolutions', label: 'Évolutions et dépendances', kinds: [] }
] as const satisfies readonly { id: string; label: string; kinds: readonly DiagramKind[] }[];
export type ViewId = (typeof VIEWS)[number]['id'];

export interface MenuLeaf {
	id: string;
	label: string;
	href: string;
	status?: DeliveryStatus;
}
export interface MenuGroup {
	id: string;
	label: string;
	href: string;
	count: number;
	children: MenuLeaf[];
}
export interface MenuSection {
	id: string;
	label: string;
	groups: MenuGroup[];
}

const diagramLeaf = (d: DiagramDefinition): MenuLeaf => ({
	id: d.id,
	label: d.title,
	href: `/diagram/d/${d.slug}`,
	status: d.status
});

/** Arborescence du menu latéral : légère (titres et liens), sans détail. */
export function menu(): MenuSection[] {
	const actorGroups = (kind: 'metier' | 'structure' | 'role') =>
		ACTORS.filter((a) => a.kind === kind).map((a) => ({
			id: `acteur-${a.id}`,
			label: a.label,
			href: `/diagram/acteurs/${a.id}`,
			count: diagramsOfActor(a.id).length,
			children: diagramsOfActor(a.id).map(diagramLeaf)
		}));
	return [
		{
			id: 'global',
			label: 'Vue globale',
			groups: [
				{
					id: 'vue-globale',
					label: 'Carte de Melokiva',
					href: '/diagram',
					count: DIAGRAMS.filter((d) => d.kind === 'carte').length,
					children: DIAGRAMS.filter((d) => d.kind === 'carte').map(diagramLeaf)
				}
			]
		},
		{ id: 'metiers', label: 'Métiers', groups: actorGroups('metier') },
		{ id: 'structures', label: 'Structures', groups: actorGroups('structure') },
		{ id: 'roles', label: 'Rôles et droits', groups: actorGroups('role') },
		{
			id: 'domaines',
			label: 'Domaines',
			groups: DOMAINS.map((d) => ({
				id: `domaine-${d.id}`,
				label: d.label,
				href: `/diagram/domaines/${d.id}`,
				count: diagramsOfDomain(d.id).length,
				children: diagramsOfDomain(d.id).map(diagramLeaf)
			}))
		},
		{
			id: 'vues',
			label: 'Vues',
			groups: VIEWS.map((v) => {
				const list = DIAGRAMS.filter((d) => (v.kinds as readonly string[]).includes(d.kind));
				return {
					id: `vue-${v.id}`,
					label: v.label,
					href: `/diagram/vues/${v.id}`,
					count: list.length,
					children: list.map(diagramLeaf)
				};
			})
		},
		{
			id: 'outils',
			label: 'Inventaire et contrôle',
			groups: [
				{
					id: 'inventaire',
					label: 'Inventaire des processus',
					href: '/diagram/inventaire',
					count: PROCESSES.length,
					children: []
				},
				{
					id: 'entites',
					label: 'Entités Prisma',
					href: '/diagram/entites',
					count: entitiesInUse().length,
					children: []
				},
				{
					id: 'controle',
					label: 'Couverture et contrôle',
					href: '/diagram/controle',
					count: 0,
					children: []
				}
			]
		}
	];
}

// ── Recherche ───────────────────────────────────────────────────────────────

export type SearchType =
	'diagram' | 'step' | 'process' | 'entity' | 'actor' | 'domain' | 'decision';

export interface SearchEntry {
	type: SearchType;
	id: string;
	title: string;
	href: string;
	/** Contexte affiché sous le titre. */
	context: string;
	domain?: string;
	actors: string[];
	status?: DeliveryStatus;
	kind?: DiagramKind;
	/** Texte normalisé indexé (titre compris). */
	text: string;
	titleText: string;
}

export const normalize = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[·’']/g, ' ')
		.toLowerCase();

/** Équivalences métier : « retrait » doit trouver « retirer », « révoquer »… */
const SYNONYMS: Record<string, string[]> = {
	retrait: ['retir', 'revoqu', 'remove', 'cancel'],
	retirer: ['retrait', 'revoqu'],
	suppression: ['supprim', 'delete', 'effac'],
	effacement: ['effac', 'anonymis', 'delete'],
	invitation: ['invit'],
	inviter: ['invit'],
	candidature: ['candidat', 'apply', 'application'],
	confirme: ['confirm'],
	confirmation: ['confirm'],
	concert: ['concert', 'gig'],
	besoin: ['besoin', 'need'],
	projet: ['projet', 'project'],
	groupe: ['groupe', 'band'],
	annonce: ['annonce', 'opportunit'],
	xp: ['xp', 'progression', 'xptransaction'],
	booker: ['booker'],
	ingenieur: ['inge son', 'sound_engineer'],
	inge: ['inge son', 'sound_engineer'],
	pourvu: ['pourvu', 'fill'],
	refus: ['refus', 'decline', '403', '404', '409'],
	permission: ['permission', 'droit', 'gestion', 'coordination']
};

const words = (s: string) =>
	normalize(s)
		.split(/[^a-z0-9#_]+/)
		.filter(Boolean);

/** Variantes d'un mot de requête : lui-même, sa racine, ses équivalences. */
export function variants(token: string): string[] {
	const out = new Set([token]);
	if (token.length >= 6) out.add(token.replace(/(ements?|tions?|ions?|ees?|es|er|e|s)$/, ''));
	for (const [key, list] of Object.entries(SYNONYMS)) {
		if (token === key || (token.length >= 5 && key.startsWith(token)))
			list.forEach((v) => out.add(v));
	}
	return [...out].filter((v) => v.length >= 2);
}

const label = (id: string) => actorById.get(id)?.label ?? id;
const domainLabel = (id: string) => domainById.get(id)?.label ?? id;
const refsText = (r: References) => [
	...r.decisions,
	...r.issues.map((i) => `#${i}`),
	...r.sourceFiles,
	...r.tests
];

function entry(
	e: Omit<SearchEntry, 'text' | 'titleText'>,
	parts: (string | undefined)[]
): SearchEntry {
	return {
		...e,
		titleText: normalize(e.title),
		text: normalize([e.title, e.context, ...parts.filter(Boolean)].join(' \n '))
	};
}

function processEntry(p: ProcessEntry): SearchEntry {
	const trigger =
		p.trigger.kind === 'action'
			? `${p.trigger.route} ?/${p.trigger.name}`
			: p.trigger.kind === 'none'
				? ''
				: `${p.trigger.route} ${'method' in p.trigger ? p.trigger.method : 'load'}`;
	return entry(
		{
			type: 'process',
			id: p.id,
			title: p.title,
			href: `/diagram/processus/${encodeURIComponent(p.id)}`,
			context: `${domainLabel(p.domain)} · ${STATUS_LABELS[p.status]}`,
			domain: p.domain,
			actors: p.actors,
			status: p.status
		},
		[
			p.id,
			trigger,
			...p.actors.map(label),
			...p.entities,
			...p.services,
			...p.errors,
			p.notes,
			...refsText(p.references)
		]
	);
}

/** Index de recherche, construit une fois par processus serveur. */
export function buildSearchIndex(decisions: Record<string, DecisionRef> = {}): SearchEntry[] {
	const out: SearchEntry[] = [];
	for (const d of DIAGRAMS) {
		out.push(
			entry(
				{
					type: 'diagram',
					id: d.id,
					title: d.title,
					href: `/diagram/d/${d.slug}`,
					context: `${KIND_LABELS[d.kind]} · ${domainLabel(d.domain)}`,
					domain: d.domain,
					actors: d.actors,
					status: d.status,
					kind: d.kind
				},
				[d.description, ...d.actors.map(label), ...d.entities, ...refsText(d.references)]
			)
		);
		for (const s of d.steps) {
			const process = s.process ? processById.get(s.process) : undefined;
			out.push(
				entry(
					{
						type: 'step',
						id: `${d.id}#${s.id}`,
						title: s.title,
						href: `/diagram/d/${d.slug}?noeud=${encodeURIComponent(s.id)}`,
						context: `Étape de « ${d.title} »`,
						domain: process?.domain ?? d.domain,
						actors: [s.actor],
						status: s.status,
						kind: d.kind
					},
					[
						s.description,
						label(s.actor),
						process?.title,
						process?.id,
						...s.preconditions,
						...s.inputs,
						...s.validations,
						...s.reads,
						...s.writes,
						...s.effects,
						...s.permissions,
						...s.transitions,
						...s.errors,
						...refsText(s.references)
					]
				)
			);
		}
	}
	out.push(...PROCESSES.map(processEntry));
	for (const e of entitiesInUse()) {
		out.push(
			entry(
				{
					type: 'entity',
					id: e.name,
					title: e.name,
					href: `/diagram/entites/${encodeURIComponent(e.name)}`,
					context: `Entité Prisma · ${e.processes} processus, ${e.diagrams} diagrammes`,
					actors: []
				},
				[]
			)
		);
	}
	for (const a of ACTORS) {
		out.push(
			entry(
				{
					type: 'actor',
					id: a.id,
					title: a.label,
					href: `/diagram/acteurs/${a.id}`,
					context: a.kind === 'metier' ? 'Métier' : a.kind === 'structure' ? 'Structure' : 'Rôle',
					actors: [a.id]
				},
				[a.description, a.prisma]
			)
		);
	}
	for (const d of DOMAINS) {
		out.push(
			entry(
				{
					type: 'domain',
					id: d.id,
					title: d.label,
					href: `/diagram/domaines/${d.id}`,
					context: 'Domaine',
					domain: d.id,
					actors: []
				},
				[d.description]
			)
		);
	}
	const cited = new Set([
		...PROCESSES.flatMap((p) => p.references.decisions),
		...DIAGRAMS.flatMap((d) => d.references.decisions)
	]);
	for (const id of [...cited].sort()) {
		const info = decisions[id];
		out.push(
			entry(
				{
					type: 'decision',
					id,
					title: info ? `${id} — ${info.title}` : id,
					href: `/diagram/inventaire?decision=${id}`,
					context: `Décision · ${info?.label ?? 'statut inconnu'}`,
					actors: []
				},
				[]
			)
		);
	}
	return out;
}

export interface SearchFilters {
	domain?: string;
	actor?: string;
	status?: DeliveryStatus;
	kind?: DiagramKind;
	type?: SearchType;
}

const TYPE_WEIGHT: Record<SearchType, number> = {
	diagram: 6,
	domain: 5,
	actor: 5,
	process: 4,
	step: 3,
	entity: 3,
	decision: 2
};

/** Tous les mots doivent être trouvés (ET) ; le titre pèse plus que le corps. */
export function search(
	index: SearchEntry[],
	query: string,
	filters: SearchFilters = {},
	limit = 50
) {
	const tokens = words(query);
	const scored: { e: SearchEntry; score: number }[] = [];
	for (const e of index) {
		if (filters.domain && e.domain !== filters.domain) continue;
		if (filters.actor && !e.actors.includes(filters.actor)) continue;
		if (filters.status && e.status !== filters.status) continue;
		if (filters.kind && e.kind !== filters.kind) continue;
		if (filters.type && e.type !== filters.type) continue;
		let score = tokens.length === 0 ? 1 : 0;
		let all = true;
		for (const t of tokens) {
			const vs = variants(t);
			if (vs.some((v) => e.titleText.includes(v))) score += 10;
			else if (vs.some((v) => e.text.includes(v))) score += 3;
			else {
				all = false;
				break;
			}
		}
		if (!all) continue;
		scored.push({ e, score: score * 10 + TYPE_WEIGHT[e.type] });
	}
	scored.sort((a, b) => b.score - a.score || a.e.title.localeCompare(b.e.title));
	return { total: scored.length, results: scored.slice(0, limit).map((s) => s.e) };
}

// ── Cohérence diagramme ↔ catalogue ─────────────────────────────────────────

export interface Problem {
	kind:
		| 'process-sans-diagramme'
		| 'diagramme-sans-source'
		| 'reference-cassee'
		| 'acteur-sans-parcours'
		| 'relation-manquante'
		| 'sans-erreur'
		| 'transition-sans-permission'
		| 'teste-sans-test'
		| 'decision-proposee'
		| 'obsolete-active'
		| 'noeud-etape';
	subject: string;
	href?: string;
	message: string;
	domain?: string;
}

export const PROBLEM_LABELS: Readonly<Record<Problem['kind'], string>> = {
	'process-sans-diagramme': 'Processus implémentés sans diagramme détaillé',
	'diagramme-sans-source': 'Diagrammes sans source .drawio lisible',
	'reference-cassee': 'Références inexistantes (fichier, service, entité, décision)',
	'acteur-sans-parcours': 'Acteurs sans parcours ni couloir',
	'relation-manquante': 'Relations entre diagrammes manquantes ou asymétriques',
	'sans-erreur': 'Processus implémentés sans cas d’erreur documenté',
	'transition-sans-permission': 'Transitions sans permission documentée',
	'teste-sans-test': 'Déclarés testés sans référence de test',
	'decision-proposee': 'Liés à une décision encore proposée',
	'obsolete-active': 'Fonctionnalités obsolètes encore présentées comme actives',
	'noeud-etape': 'Nœuds .drawio et étapes du catalogue désaccordés'
};

/** Accord entre une source `.drawio` et les étapes du catalogue. */
export function checkModel(def: DiagramDefinition, model: DrawioModel): Problem[] {
	const problems: Problem[] = [];
	const href = `/diagram/d/${def.slug}`;
	const push = (message: string) =>
		problems.push({ kind: 'noeud-etape', subject: def.id, href, message, domain: def.domain });
	const nodes = model.cells.filter((c) => c.role === 'step' || c.role === 'lane');
	const nodeIds = new Set(nodes.map((c) => c.id));
	const stepIds = new Set(def.steps.map((s) => s.id));
	for (const s of def.steps) if (!nodeIds.has(s.id)) push(`Étape « ${s.id} » absente du .drawio`);
	for (const n of nodes)
		if (!stepIds.has(n.id)) push(`Nœud « ${n.id} » sans étape dans le catalogue`);
	const edges = model.cells.filter((c) => c.role === 'edge');
	const drawn = new Set<string>();
	for (const e of edges) {
		if (!e.source || !e.target || !nodeIds.has(e.source) || !nodeIds.has(e.target)) {
			push(`Arête « ${e.id} » sans extrémités valides`);
			continue;
		}
		const key = `${e.source}>${e.target}`;
		drawn.add(key);
		const step = def.steps.find((s) => s.id === e.source);
		const expected = e.dashed ? step?.alternatives : step?.next;
		if (!expected?.includes(e.target)) {
			push(
				`Arête ${key} (${e.dashed ? 'pointillé' : 'pleine'}) absente de ${e.dashed ? 'alternatives' : 'next'}`
			);
		}
	}
	for (const s of def.steps) {
		for (const t of [...s.next, ...s.alternatives]) {
			if (!drawn.has(`${s.id}>${t}`)) push(`Relation ${s.id} → ${t} non dessinée`);
		}
	}
	return problems;
}

/** Problèmes de références d'un objet du catalogue. */
function refProblems(
	subject: string,
	href: string,
	domain: string | undefined,
	r: References,
	data: ReferenceData,
	extra: { services?: string[]; entities?: string[] } = {}
): Problem[] {
	const out: Problem[] = [];
	const models = new Set(data.models);
	const push = (message: string) =>
		out.push({ kind: 'reference-cassee', subject, href, message, domain });
	for (const f of [...r.sourceFiles, ...r.tests, ...r.docs])
		if (data.files[f] !== true) push(`Fichier introuvable : ${f}`);
	for (const s of extra.services ?? [])
		if (data.services[s] !== true) push(`Service introuvable : ${s}`);
	for (const e of extra.entities ?? []) if (!models.has(e)) push(`Entité inconnue : ${e}`);
	for (const d of r.decisions) if (!data.decisions[d]) push(`Décision absente du registre : ${d}`);
	return out;
}

const IMPLEMENTED: readonly DeliveryStatus[] = ['TESTED', 'IMPLEMENTED'];

/** Tous les contrôles documentaires (vue « Couverture et contrôle »). */
export function controls(data: ReferenceData, models: Map<string, DrawioModel | Error>): Problem[] {
	const problems: Problem[] = [];
	const documented = documentedProcessIds();
	const proposed = (ids: string[]) => ids.filter((d) => data.decisions[d]?.status === 'PROPOSED');
	for (const p of PROCESSES) {
		const href = `/diagram/processus/${encodeURIComponent(p.id)}`;
		problems.push(
			...refProblems(p.id, href, p.domain, p.references, data, {
				services: p.services,
				entities: p.entities
			})
		);
		if (IMPLEMENTED.includes(p.status) && !documented.has(p.id)) {
			problems.push({
				kind: 'process-sans-diagramme',
				subject: p.id,
				href,
				message: p.title,
				domain: p.domain
			});
		}
		if (IMPLEMENTED.includes(p.status) && p.errors.length === 0) {
			problems.push({
				kind: 'sans-erreur',
				subject: p.id,
				href,
				message: p.title,
				domain: p.domain
			});
		}
		if (p.status === 'TESTED' && p.references.tests.length === 0) {
			problems.push({
				kind: 'teste-sans-test',
				subject: p.id,
				href,
				message: p.title,
				domain: p.domain
			});
		}
		for (const d of proposed(p.references.decisions)) {
			problems.push({
				kind: 'decision-proposee',
				subject: p.id,
				href,
				message: `${p.title} — ${d}`,
				domain: p.domain
			});
		}
	}
	for (const d of DIAGRAMS) {
		const href = `/diagram/d/${d.slug}`;
		const model = models.get(d.id);
		if (!model || model instanceof Error || data.files[d.source] !== true) {
			problems.push({
				kind: 'diagramme-sans-source',
				subject: d.id,
				href,
				message: model instanceof Error ? model.message : `Source absente : ${d.source}`,
				domain: d.domain
			});
		} else {
			problems.push(...checkModel(d, model));
		}
		problems.push(
			...refProblems(d.id, href, d.domain, d.references, data, { entities: d.entities })
		);
		for (const rel of [...d.parents, ...d.children, ...d.related]) {
			if (!diagramById.has(rel)) {
				problems.push({
					kind: 'relation-manquante',
					subject: d.id,
					href,
					message: `Diagramme lié inconnu : ${rel}`,
					domain: d.domain
				});
			}
		}
		for (const child of d.children) {
			if (diagramById.get(child) && !diagramById.get(child)!.parents.includes(d.id)) {
				problems.push({
					kind: 'relation-manquante',
					subject: d.id,
					href,
					message: `${child} ne déclare pas ${d.id} comme parent`,
					domain: d.domain
				});
			}
		}
		for (const parent of d.parents) {
			if (diagramById.get(parent) && !diagramById.get(parent)!.children.includes(d.id)) {
				problems.push({
					kind: 'relation-manquante',
					subject: d.id,
					href,
					message: `${parent} ne déclare pas ${d.id} comme enfant`,
					domain: d.domain
				});
			}
		}
		if (d.status === 'TESTED' && d.references.tests.length === 0) {
			problems.push({
				kind: 'teste-sans-test',
				subject: d.id,
				href,
				message: d.title,
				domain: d.domain
			});
		}
		for (const dec of proposed(d.references.decisions)) {
			problems.push({
				kind: 'decision-proposee',
				subject: d.id,
				href,
				message: `${d.title} — ${dec}`,
				domain: d.domain
			});
		}
		for (const s of d.steps) {
			const shref = `${href}?noeud=${encodeURIComponent(s.id)}`;
			problems.push(
				...refProblems(`${d.id}#${s.id}`, shref, d.domain, s.references, data, {
					entities: [...s.reads, ...s.writes]
				})
			);
			if (s.transitions.length > 0 && s.permissions.length === 0) {
				problems.push({
					kind: 'transition-sans-permission',
					subject: `${d.id}#${s.id}`,
					href: shref,
					message: s.title,
					domain: d.domain
				});
			}
			if (s.status === 'TESTED' && s.references.tests.length === 0) {
				problems.push({
					kind: 'teste-sans-test',
					subject: `${d.id}#${s.id}`,
					href: shref,
					message: s.title,
					domain: d.domain
				});
			}
			const process = s.process ? processById.get(s.process) : undefined;
			if (process?.status === 'DEPRECATED' && s.status !== 'DEPRECATED') {
				problems.push({
					kind: 'obsolete-active',
					subject: `${d.id}#${s.id}`,
					href: shref,
					message: `${s.title} cite ${process.id}, obsolète`,
					domain: d.domain
				});
			}
		}
		if (
			d.status !== 'DEPRECATED' &&
			d.steps.length > 0 &&
			d.steps.every((s) => s.status === 'DEPRECATED')
		) {
			problems.push({
				kind: 'obsolete-active',
				subject: d.id,
				href,
				message: d.title,
				domain: d.domain
			});
		}
	}
	const covered = new Set(
		DIAGRAMS.filter((d) => d.kind === 'parcours' || d.kind === 'couloirs').flatMap((d) => [
			...d.actors,
			...d.steps.map((s) => s.actor)
		])
	);
	for (const a of ACTORS) {
		if (!covered.has(a.id)) {
			problems.push({
				kind: 'acteur-sans-parcours',
				subject: a.id,
				href: `/diagram/acteurs/${a.id}`,
				message: a.label
			});
		}
	}
	return problems;
}

// ── Couverture ──────────────────────────────────────────────────────────────

export interface DomainCoverage {
	domain: string;
	label: string;
	processes: number;
	implemented: number;
	tested: number;
	planned: number;
	documented: number;
	diagrams: number;
	verified: number;
}

/** Couverture par domaine, calculée sur l'inventaire réel. */
export function coverage(data: ReferenceData): DomainCoverage[] {
	const documented = documentedProcessIds();
	return DOMAINS.map((d) => {
		const list = processesOfDomain(d.id);
		const docs = list.filter((p) => documented.has(p.id));
		return {
			domain: d.id,
			label: d.label,
			processes: list.length,
			implemented: list.filter((p) => IMPLEMENTED.includes(p.status)).length,
			tested: list.filter((p) => p.status === 'TESTED').length,
			planned: list.filter((p) => !IMPLEMENTED.includes(p.status)).length,
			documented: docs.length,
			diagrams: diagramsOfDomain(d.id).length,
			verified: docs.filter(
				(p) =>
					refProblems(p.id, '', p.domain, p.references, data, {
						services: p.services,
						entities: p.entities
					}).length === 0
			).length
		};
	});
}

// ── Modèles ─────────────────────────────────────────────────────────────────

/** Lit les sources demandées ; une source illisible devient une `Error`, jamais une exception. */
export async function loadModels(
	ids: string[],
	read: (source: string) => Promise<string | null>
): Promise<Map<string, DrawioModel | Error>> {
	const out = new Map<string, DrawioModel | Error>();
	await Promise.all(
		ids.map(async (id) => {
			const def = diagramById.get(id);
			if (!def) return;
			try {
				const xml = await read(def.source);
				out.set(id, xml === null ? new Error(`Source absente : ${def.source}`) : parseDrawio(xml));
			} catch (err) {
				out.set(id, err instanceof Error ? err : new Error(String(err)));
			}
		})
	);
	return out;
}

/** Ordre de lecture d'un diagramme, pour le rendu textuel alternatif. */
export function readingOrder(def: DiagramDefinition): DiagramStep[] {
	const byId = new Map(def.steps.map((s) => [s.id, s]));
	const targets = new Set(def.steps.flatMap((s) => [...s.next, ...s.alternatives]));
	const roots = def.steps.filter((s) => !targets.has(s.id));
	const seen = new Set<string>();
	const order: DiagramStep[] = [];
	const visit = (s: DiagramStep) => {
		if (seen.has(s.id)) return;
		seen.add(s.id);
		order.push(s);
		for (const n of [...s.next, ...s.alternatives]) {
			const t = byId.get(n);
			if (t) visit(t);
		}
	};
	(roots.length > 0 ? roots : def.steps.slice(0, 1)).forEach(visit);
	def.steps.forEach(visit);
	return order;
}

export { ACTORS, DOMAINS, DIAGRAMS, PROCESSES, KIND_LABELS, STATUS_LABELS };
