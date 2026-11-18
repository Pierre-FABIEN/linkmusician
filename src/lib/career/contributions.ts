/**
 * « Mes contributions » (U1, #71, conception 20 §10) : règle pure, partagée
 * par le serveur et la page, sans accès aux données.
 *
 * Une **contribution** est une réalisation à laquelle la personne a
 * effectivement pris part, et qu'un fait admissible confirme. Elle se lit
 * dans la lecture unifiée N1 (`#lib/career/realisations`), jamais à côté :
 *
 * - un **crédit** confirmé sur un morceau (`CREDIT`, ou `WORK_COMPOSED` pour
 *   un crédit sans rôle précisé) ;
 * - une **collaboration terminée**, confirmée par chaque partie
 *   (`COLLABORATION`), qu'on y joue, y assure une prestation ou accueille la
 *   date.
 *
 * Ne sont **pas** des contributions : l'étape « première fois » d'un groupe
 * (`MILESTONE`, « mon groupe l'a fait »), le morceau produit d'un groupe dont
 * on est membre sans y être crédité·e (`PRODUCTION_STAGE`), la gestion d'un
 * morceau, une profession déclarée, une proposition acceptée et, par défaut
 * (UX-5, non tranché), la participation à un projet.
 *
 * **Une ligne par réalisation** (NL3, D73) : tous les rôles d'une personne
 * sur un même morceau, et les collaborations terminées liées à ce morceau,
 * forment une seule ligne (`work:<id>`) ; une collaboration sans morceau a
 * la sienne (`collab:<id>`). Deux morceaux d'une même séance restent deux
 * lignes. La ligne garde les clés N1 de ses faits (`sources`) et sa
 * **meilleure preuve** : collaboration terminée, puis crédit consenti, puis
 * déclaration. Aucun point, aucun niveau ici (D54) : `CraftSummary` reste la
 * seule source des statistiques de métier.
 */
import type { Realisation } from './realisations';
import { COLLAB_KIND_LABELS, type CollabKindValue } from '#lib/collaborations/rules';
import { WORK_ROLE_LABELS, type WorkRoleKindValue } from '#lib/works/rules';

/** Familles de filtre, d'après les rôles réellement exercés. */
export const CONTRIBUTION_CATEGORIES = ['SON', 'PRODUCTION', 'SCENE', 'JEU', 'ECRITURE'] as const;
export type ContributionCategory = (typeof CONTRIBUTION_CATEGORIES)[number];
export type ContributionFilter = ContributionCategory | 'TOUT';

export const CONTRIBUTION_CATEGORY_LABELS: Readonly<Record<ContributionCategory, string>> = {
	SON: 'Son',
	PRODUCTION: 'Production',
	SCENE: 'Scène',
	JEU: 'Jeu',
	ECRITURE: 'Écriture'
};

/** Adresse lisible d'un filtre (`?role=son`). */
export const CATEGORY_SLUGS: Readonly<Record<ContributionCategory, string>> = {
	SON: 'son',
	PRODUCTION: 'production',
	SCENE: 'scene',
	JEU: 'jeu',
	ECRITURE: 'ecriture'
};

export function filterFromSlug(slug: string | null): ContributionFilter {
	const found = CONTRIBUTION_CATEGORIES.find((c) => CATEGORY_SLUGS[c] === slug);
	return found ?? 'TOUT';
}

/**
 * Niveau de confirmation affiché, du plus fort au plus faible :
 * - `CONFIRMED` : une collaboration terminée, confirmée par chaque partie ;
 * - `CREDITED` : un crédit accepté, sur un morceau corroboré ou pour un rôle
 *   du son confirmé des deux côtés ;
 * - `DECLARED` : un crédit sur un morceau composé seul·e (déclaré, P3-11).
 */
export type ContributionProof = 'CONFIRMED' | 'CREDITED' | 'DECLARED';
const PROOF_RANK: Record<ContributionProof, number> = { DECLARED: 0, CREDITED: 1, CONFIRMED: 2 };

export const PROOF_LABELS: Readonly<Record<ContributionProof, string>> = {
	CONFIRMED: 'Confirmé',
	CREDITED: 'Crédité·e',
	DECLARED: 'Déclaré'
};

export const PROOF_HINTS: Readonly<Record<ContributionProof, string>> = {
	CONFIRMED: 'collaboration terminée, confirmée par chaque partie',
	CREDITED: 'crédit accepté sur le morceau',
	DECLARED: 'morceau composé sans autre crédit confirmé'
};

/** Prestations d'une collaboration (`CraftService`), recopiées du noyau serveur. */
export type ContributionService =
	'RECORDING' | 'MIXING' | 'MASTERING' | 'LIVE_SOUND' | 'PRODUCTION' | 'ARRANGEMENT';

const SERVICE_LABELS: Readonly<Record<ContributionService, string>> = {
	RECORDING: WORK_ROLE_LABELS.RECORDING,
	MIXING: WORK_ROLE_LABELS.MIXING,
	MASTERING: WORK_ROLE_LABELS.MASTERING,
	LIVE_SOUND: COLLAB_KIND_LABELS.LIVE_SOUND,
	PRODUCTION: WORK_ROLE_LABELS.PRODUCTION,
	ARRANGEMENT: WORK_ROLE_LABELS.ARRANGEMENT
};

const SERVICE_CATEGORY: Readonly<Record<ContributionService, ContributionCategory>> = {
	RECORDING: 'SON',
	MIXING: 'SON',
	MASTERING: 'SON',
	LIVE_SOUND: 'SON',
	PRODUCTION: 'PRODUCTION',
	ARRANGEMENT: 'PRODUCTION'
};

const ROLE_CATEGORY: Readonly<Record<WorkRoleKindValue, ContributionCategory>> = {
	INSTRUMENT: 'JEU',
	COMPOSITION: 'ECRITURE',
	LYRICS: 'ECRITURE',
	ARRANGEMENT: 'ECRITURE',
	RECORDING: 'SON',
	MIXING: 'SON',
	MASTERING: 'SON',
	PRODUCTION: 'PRODUCTION'
};

/**
 * Une autre personne ou structure, telle que le serveur l'a lue pour moi :
 * `deleted` (compte anonymisé), `blocked` (blocage dans un sens ou l'autre).
 */
export type ContributionParty = { displayName: string; deleted: boolean; blocked: boolean };

/**
 * Nom affiché d'une partie : « Compte supprimé » pour un compte anonymisé
 * (conception 19 §9.5), rien pour une personne bloquée dans un sens ou
 * l'autre (U0) : le fait reste, l'identité ne sort pas.
 */
export function partyName(p: ContributionParty): string | null {
	if (p.deleted) return 'Compte supprimé';
	if (p.blocked) return null;
	return p.displayName;
}

/** Un morceau, lu par le serveur pour la personne. */
export type WorkDetail = {
	id: string;
	title: string;
	state: 'IDEA' | 'COMPOSED';
	/** Porteur ; `null` quand c'est la personne elle-même. */
	owner: (ContributionParty & { dissolved: boolean }) | null;
	/** Ses propres rôles, par identifiant (`WorkRole.id`). */
	roles: Readonly<Record<string, { kind: WorkRoleKindValue; instrument: string | null }>>;
	/** Sa fiche s'ouvre sans rien révéler (équipe du morceau, porteur actif, aucun blocage). */
	open: boolean;
};

/** Une collaboration terminée, lue par le serveur pour la personne. */
export type CollabDetail = {
	id: string;
	title: string;
	kind: CollabKindValue;
	happenedOn: Date;
	workId: string | null;
	/** Sa prestation sur cette collaboration, s'il y en a une. */
	service: ContributionService | null;
	others: readonly ContributionParty[];
	/** Conversation d'origine, si elle y participe et qu'aucune partie n'est bloquée. */
	conversationId: string | null;
};

export type ContributionDetails = {
	works: ReadonlyMap<string, WorkDetail>;
	collabs: ReadonlyMap<string, CollabDetail>;
};

export type ContributionLine = {
	/** `work:<id>` ou `collab:<id>` : stable, une ligne par réalisation. */
	key: string;
	/** Clés N1 des faits qui la composent (`realisationKey`). */
	sources: string[];
	title: string;
	/** Rôles réellement exercés, sans doublon, dans l'ordre de lecture. */
	roles: string[];
	categories: ContributionCategory[];
	date: Date | null;
	proof: ContributionProof;
	/** Un fait contesté, en attente de la modération. */
	frozen: boolean;
	/** Personne ou structure liée, si elle est visible. */
	with: string | null;
	/** Mentions : « groupe dissous », « idée ». */
	notes: string[];
	href: string | null;
};

type Draft = {
	key: string;
	sources: string[];
	roles: string[];
	categories: Set<ContributionCategory>;
	date: Date | null;
	/** Meilleure preuve des faits actifs, puis des faits gelés. */
	proof: ContributionProof | null;
	frozenProof: ContributionProof | null;
	workId: string | null;
	collabIds: string[];
	/** Un crédit sans rôle précisé (`WORK_COMPOSED` seul). */
	bareCredit: boolean;
};

function earliest(a: Date | null, b: Date | null) {
	if (!a) return b;
	if (!b) return a;
	return a.getTime() <= b.getTime() ? a : b;
}

const creditProof = (r: Realisation): ContributionProof =>
	r.proof === 'DECLARED' ? 'DECLARED' : 'CREDITED';

/** Rôle et famille d'une collaboration terminée, du point de vue de la personne. */
function collabRole(r: Realisation, c: CollabDetail | undefined) {
	if (r.roles.includes('HOST')) return { label: 'Accueil de la date', category: 'SCENE' as const };
	if (c?.service)
		return { label: SERVICE_LABELS[c.service], category: SERVICE_CATEGORY[c.service] };
	if (!c) return { label: 'Collaboration', category: null };
	return {
		label: COLLAB_KIND_LABELS[c.kind],
		category: c.kind === 'GIG' ? ('SCENE' as const) : ('JEU' as const)
	};
}

/**
 * Lignes de « Mes contributions », depuis les réalisations N1 de la personne
 * (déjà dédupliquées par clé de fait) et les détails lus pour elle. Une
 * réalisation retirée n'est plus une contribution ; une réalisation gelée
 * reste, marquée, sans élever sa preuve.
 */
export function contributionLines(
	realisations: readonly Realisation[],
	details: ContributionDetails
): ContributionLine[] {
	const drafts = new Map<string, Draft>();
	const touch = (key: string, workId: string | null): Draft => {
		let d = drafts.get(key);
		if (!d) {
			d = {
				key,
				sources: [],
				roles: [],
				categories: new Set(),
				date: null,
				proof: null,
				frozenProof: null,
				workId,
				collabIds: [],
				bareCredit: false
			};
			drafts.set(key, d);
		}
		return d;
	};
	const add = (
		d: Draft,
		r: Realisation,
		proof: ContributionProof,
		date: Date | null,
		role: { label: string; category: ContributionCategory | null } | null
	) => {
		if (!d.sources.includes(r.key)) d.sources.push(r.key);
		if (role && !d.roles.includes(role.label)) d.roles.push(role.label);
		if (role?.category) d.categories.add(role.category);
		d.date = earliest(d.date, date);
		// Un fait contesté ne confirme rien tant que la modération n'a pas tranché.
		if (r.status === 'FROZEN') d.frozenProof = maxProof(d.frozenProof, proof);
		else d.proof = maxProof(d.proof, proof);
	};

	for (const r of realisations) {
		if (r.status === 'RETIRED') continue;
		if (r.kind === 'CREDIT' && r.object.type === 'WORK_ROLE') {
			const work = details.works.get(r.object.workId);
			const mine = work?.roles[r.object.id];
			const kind = (mine?.kind ?? r.object.roleKind) as WorkRoleKindValue;
			const label =
				kind === 'INSTRUMENT' ? (mine?.instrument ?? 'Instrument') : WORK_ROLE_LABELS[kind];
			add(touch(`work:${r.object.workId}`, r.object.workId), r, creditProof(r), r.occurredAt, {
				label,
				category: ROLE_CATEGORY[kind] ?? null
			});
		} else if (r.kind === 'WORK_COMPOSED' && r.object.type === 'WORK') {
			const d = touch(`work:${r.object.id}`, r.object.id);
			d.bareCredit = true;
			add(d, r, creditProof(r), r.occurredAt, null);
		} else if (r.kind === 'COLLABORATION' && r.object.type === 'COLLABORATION') {
			const c = details.collabs.get(r.object.id);
			const workId = c?.workId ?? null;
			const d = touch(workId ? `work:${workId}` : `collab:${r.object.id}`, workId);
			d.collabIds.push(r.object.id);
			add(d, r, 'CONFIRMED', c?.happenedOn ?? r.occurredAt, collabRole(r, c));
		}
		// MILESTONE, PRODUCTION_STAGE : faits du groupe ou dérivés, pas des contributions.
	}

	const lines: ContributionLine[] = [];
	for (const d of drafts.values()) {
		const line = finish(d, details);
		if (line) lines.push(line);
	}
	return sortContributions(lines);
}

function maxProof(a: ContributionProof | null, b: ContributionProof) {
	return a === null || PROOF_RANK[b] > PROOF_RANK[a] ? b : a;
}

function namesOf(parties: readonly ContributionParty[]) {
	const names = parties.map(partyName).filter((n): n is string => n !== null);
	if (names.length <= 2) return names.join(', ') || null;
	return `${names.slice(0, 2).join(', ')} et ${names.length - 2} autre${names.length > 3 ? 's' : ''}`;
}

function finish(d: Draft, details: ContributionDetails): ContributionLine | null {
	const collabs = d.collabIds.flatMap((id) => {
		const c = details.collabs.get(id);
		return c ? [c] : [];
	});
	const roles = d.roles.length === 0 && d.bareCredit ? ['Crédit'] : d.roles;
	const conversation = collabs.find((c) => c.conversationId)?.conversationId ?? null;
	const collabHref = conversation ? `/messages/${conversation}` : null;
	const base = {
		key: d.key,
		sources: d.sources,
		roles,
		categories: CONTRIBUTION_CATEGORIES.filter((c) => d.categories.has(c)),
		date: d.date,
		proof: d.proof ?? d.frozenProof ?? 'DECLARED',
		// Gelée seulement si aucun fait actif ne la confirme par ailleurs.
		frozen: d.proof === null && d.frozenProof !== null
	};
	if (d.workId) {
		const w = details.works.get(d.workId);
		if (!w) {
			// Morceau introuvable (supprimé entre deux lectures) : la collaboration
			// garde sa ligne si elle existe, sans titre de morceau.
			const c = collabs[0];
			if (!c) return null;
			return {
				...base,
				title: c.title,
				with: namesOf(c.others),
				notes: [],
				href: collabHref
			};
		}
		const owner = w.owner ? partyName(w.owner) : null;
		const notes = [
			...(w.owner?.dissolved ? ['groupe dissous'] : []),
			...(w.state === 'IDEA' ? ['idée'] : [])
		];
		return {
			...base,
			title: w.title,
			with: owner ?? namesOf(collabs.flatMap((c) => c.others)),
			notes,
			href: w.open ? `/morceaux/${w.id}` : collabHref
		};
	}
	const c = collabs[0];
	return {
		...base,
		// Fait du registre sans ligne de collaboration : rien d'inventé.
		title: c?.title ?? 'Collaboration terminée',
		with: c ? namesOf(c.others) : null,
		notes: [],
		href: collabHref
	};
}

/** Plus récente d'abord ; sans date en dernier ; à égalité, par clé (stable). */
export function sortContributions(lines: readonly ContributionLine[]): ContributionLine[] {
	return [...lines].sort((a, b) => {
		const ta = a.date?.getTime() ?? -Infinity;
		const tb = b.date?.getTime() ?? -Infinity;
		if (ta !== tb) return tb - ta;
		return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
	});
}

export function filterContributions(
	lines: readonly ContributionLine[],
	filter: ContributionFilter
): ContributionLine[] {
	return filter === 'TOUT' ? [...lines] : lines.filter((l) => l.categories.includes(filter));
}

/** Familles présentes dans les données : aucun filtre vide. */
export function presentCategories(lines: readonly ContributionLine[]): ContributionCategory[] {
	return CONTRIBUTION_CATEGORIES.filter((c) => lines.some((l) => l.categories.includes(c)));
}

const yearFormat = new Intl.DateTimeFormat('fr-FR', { year: 'numeric', timeZone: 'Europe/Paris' });

/** Regroupe par année (heure de Paris), dans l'ordre reçu ; `null` pour les lignes sans date. */
export function byYear<T extends { date: Date | null }>(lines: readonly T[]) {
	const groups: { year: number | null; lines: T[] }[] = [];
	for (const line of lines) {
		const year = line.date ? Number(yearFormat.format(line.date)) : null;
		const last = groups.at(-1);
		if (last && last.year === year) last.lines.push(line);
		else groups.push({ year, lines: [line] });
	}
	return groups;
}
