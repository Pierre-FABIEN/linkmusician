/**
 * LINKMUSICIAN: types du catalogue Melokiva Diagram (DIAGRAM-01, D80).
 *
 * Trois couches, jamais recopiées l'une dans l'autre :
 * - l'**inventaire** (`ProcessEntry`) : chaque processus réellement présent
 *   dans le code (action de formulaire, endpoint, job), ou conçu et prévu
 *   dans la documentation, avec sa provenance ;
 * - les **diagrammes** (`DiagramDefinition`) : un angle d'étude d'un ou
 *   plusieurs processus, dessiné dans un `.drawio` ;
 * - les **étapes** (`DiagramStep`) : le détail d'un nœud. L'identifiant
 *   d'une étape est l'identifiant (`id`) de la cellule dans le `.drawio` ;
 *   le test de cohérence échoue si l'un manque à l'autre.
 *
 * Module pur : aucun import de Prisma, `$app/*` ou `$env/*`, pour être lu
 * par les tests et par `scripts/diagram/sync.ts`.
 */

/** Statut de livraison, du plus sûr au moins sûr (§2 de la mission). */
export const DELIVERY_STATUSES = [
	'TESTED',
	'IMPLEMENTED',
	'DESIGNED',
	'PLANNED',
	'DEPRECATED'
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const STATUS_LABELS: Readonly<Record<DeliveryStatus, string>> = {
	TESTED: 'Implémenté et testé',
	IMPLEMENTED: 'Implémenté, non vérifié',
	DESIGNED: 'Conçu, non développé',
	PLANNED: 'Prévu, non spécifié',
	DEPRECATED: 'Obsolète ou remplacé'
};

/** Angle d'étude d'un diagramme (§7 de la mission, A à F, plus permissions). */
export const DIAGRAM_KINDS = [
	'carte',
	'parcours',
	'couloirs',
	'dataflow',
	'donnees',
	'etats',
	'permissions'
] as const;
export type DiagramKind = (typeof DIAGRAM_KINDS)[number];

export const KIND_LABELS: Readonly<Record<DiagramKind, string>> = {
	carte: 'Cartographie globale',
	parcours: 'Parcours utilisateur',
	couloirs: 'Responsabilités (couloirs)',
	dataflow: 'Dataflow technique',
	donnees: 'Modèle de données',
	etats: 'Machine à états',
	permissions: 'Permissions'
};

export type ActorKind = 'metier' | 'structure' | 'role';

export interface ActorDefinition {
	id: string;
	label: string;
	kind: ActorKind;
	description: string;
	/** Valeur Prisma réelle (`TrackKind`, `OrgKind`, `Role`) quand elle existe. */
	prisma?: string;
}

export interface DomainDefinition {
	id: string;
	label: string;
	description: string;
}

/** Ce qui déclenche un processus dans le code. */
export type Trigger =
	| { kind: 'action'; route: string; name: string }
	| { kind: 'endpoint'; route: string; method: string }
	| { kind: 'job'; route: string; method: string }
	| { kind: 'load'; route: string }
	| { kind: 'none' };

/** Références communes à un processus, un diagramme ou une étape. */
export interface References {
	decisions: string[];
	issues: number[];
	/** Fichiers du dépôt (chemins depuis la racine), vérifiés par la synchronisation. */
	sourceFiles: string[];
	/** Fichiers de test (unitaires, intégration, e2e). */
	tests: string[];
	/** Documents de conception ou de domaine (`docs/…`). */
	docs: string[];
}

/** Un processus de l'inventaire. */
export interface ProcessEntry {
	/** `domaine.route.action`, stable : il sert aux liens et aux étapes. */
	id: string;
	title: string;
	domain: string;
	actors: string[];
	trigger: Trigger;
	/** Fonctions de service appelées, `module.fonction` (depuis `src/lib/server/`). */
	services: string[];
	/** Modèles Prisma lus ou écrits (noms de `schema.prisma`). */
	entities: string[];
	status: DeliveryStatus;
	/** Cas d'erreur et refus connus. Vide : non documenté (vue de contrôle). */
	errors: string[];
	references: References;
	/** Provenance : où ce processus a été trouvé. */
	provenance: 'code' | 'conception' | 'issue';
	notes?: string;
}

/** Un nœud détaillé d'un diagramme. */
export interface DiagramStep {
	/** Identifiant de la cellule dans le `.drawio`. */
	id: string;
	title: string;
	actor: string;
	/** Processus de l'inventaire que ce nœud documente, s'il en est un. */
	process?: string;
	description?: string;
	preconditions: string[];
	inputs: string[];
	validations: string[];
	/** Modèles Prisma lus. */
	reads: string[];
	/** Modèles Prisma écrits. */
	writes: string[];
	/** Conséquences, y compris ce qui **ne** se passe **pas** (aucune XP…). */
	effects: string[];
	permissions: string[];
	/** Transitions d'état, « Entité : A → B ». */
	transitions: string[];
	/** Étapes suivantes du même diagramme (arêtes sortantes). */
	next: string[];
	/** Chemins alternatifs ou d'échec (arêtes sortantes en pointillé). */
	alternatives: string[];
	errors: string[];
	status: DeliveryStatus;
	references: References;
	/** Navigation : sous-diagramme ou domaine que ce nœud ouvre. */
	goto?: { diagram?: string; domain?: string };
}

/** Un diagramme. */
export interface DiagramDefinition {
	id: string;
	slug: string;
	title: string;
	description: string;
	kind: DiagramKind;
	domain: string;
	actors: string[];
	entities: string[];
	parents: string[];
	children: string[];
	related: string[];
	/** Source éditable, depuis la racine du dépôt (`docs/diagram/drawio/…`). */
	source: string;
	status: DeliveryStatus;
	references: References;
	/** Étapes, dans l'ordre de lecture (rendu textuel alternatif). */
	steps: DiagramStep[];
}

/** Une cellule lue dans un `.drawio`. */
export interface DrawioCell {
	id: string;
	label: string;
	/** Rôle Melokiva déclaré dans le style (`lm=step|lane|note|group`). */
	role: 'step' | 'lane' | 'note' | 'group' | 'edge' | 'other';
	shape: 'box' | 'rounded' | 'ellipse' | 'rhombus' | 'swimlane' | 'entity' | 'text';
	tone?: string;
	dashed: boolean;
	x: number;
	y: number;
	width: number;
	height: number;
	source?: string;
	target?: string;
	/** Points intermédiaires d'une arête. */
	points: { x: number; y: number }[];
	parent?: string;
}

export interface DrawioModel {
	name: string;
	cells: DrawioCell[];
	width: number;
	height: number;
}

export const emptyRefs = (): References => ({
	decisions: [],
	issues: [],
	sourceFiles: [],
	tests: [],
	docs: []
});
