/**
 * Lecture unifiée des réalisations (N1, #72, conception 21 §6.3, D73) :
 * règle pure, sans table ni accès aux données.
 *
 * Une **réalisation** est un fait accompli et confirmé (ou déclaré, quand la
 * règle le permet) : morceau composé, crédit, étape de production d'un
 * morceau, étape de groupe, collaboration terminée. Ce n'est ni un état
 * (projet, tâche), ni une preuve (qui la confirme), ni une progression (ce
 * qu'elle rapporte) : aucun champ de points ici, et rien n'en dépend.
 *
 * - **NL3** : une réalisation est identifiée par la clé de son **fait
 *   source** (`key`) et ne compte qu'une fois, même vue depuis plusieurs
 *   contextes (créditée sur un morceau **et** membre du groupe qui le porte) :
 *   `dedupeRealisations` fusionne les rôles sous une seule entrée.
 * - **NL1, NL2** : rien ici n'impose d'ordre ni ne signale un manque ; une
 *   liste vide est une réponse normale.
 * - Une réalisation `FROZEN` (contestée) ou `RETIRED` ne compte dans aucune
 *   épreuve (`countable`).
 *
 * Le serveur (`#lib/server/career/realisations`) lit les tables et les
 * événements existants et construit ces objets ; la carte et la fiche de
 * carrière en déduisent leurs faits (`careerFactsOf`, `creditsOf`).
 */
import type { CareerFacts } from './map';

/** Familles d'affichage et de suggestion (conception 21 §4.2), pas des objets en base. */
export type RealisationBranch =
	'EQUIPE' | 'CREATION' | 'PRODUCTION' | 'SCENE' | 'DIFFUSION' | 'ACCOMPAGNEMENT';

export type RealisationKind =
	/** Morceau passé à « composé », où l'on est crédité·e et confirmé·e. */
	| 'WORK_COMPOSED'
	/** Un rôle crédité et confirmé sur un morceau. */
	| 'CREDIT'
	/** Morceau produit (collaboration de production terminée) où l'on a part. */
	| 'PRODUCTION_STAGE'
	/** Collaboration terminée, confirmée des deux côtés. */
	| 'COLLABORATION'
	/** Étape « première fois » d'un groupe dont on était membre à la date. */
	| 'MILESTONE';

/**
 * Comment l'acteur y a pris part (conception 21 §6.3) : « mon groupe l'a
 * fait » (`BAND_MEMBER`, membre à la date ou du groupe porteur) n'est pas
 * « je l'ai fait » (`CREDITED`, `PARTICIPANT`, `PROVIDER`, `HOST`).
 */
export type RealisationRole = 'CREDITED' | 'BAND_MEMBER' | 'PARTICIPANT' | 'PROVIDER' | 'HOST';

export type RealisationProof = 'DECLARED' | 'CORROBORATED' | 'VERIFIED';

/** `FROZEN` : contestée, en attente de la modération ; `RETIRED` : retirée. */
export type RealisationStatus = 'ACTIVE' | 'FROZEN' | 'RETIRED';

/** Objet métier qui porte le fait (jamais un projet, D72 I3). */
export type RealisationObject =
	| { type: 'WORK'; id: string }
	| { type: 'WORK_ROLE'; id: string; workId: string; roleKind: string }
	| { type: 'COLLABORATION'; id: string }
	| { type: 'MILESTONE'; id: string | null; bandId: string; definitionId: string };

export type Realisation = {
	/** Clé stable du fait source (`realisationKey`). */
	key: string;
	kind: RealisationKind;
	branch: RealisationBranch;
	/** L'acteur qui porte le fait : le porteur du morceau, le groupe de l'étape… */
	bearerId: string | null;
	object: RealisationObject;
	/** Rôles de l'acteur lu, triés et sans doublon (une entrée par fait). */
	roles: RealisationRole[];
	occurredAt: Date | null;
	proof: RealisationProof;
	status: RealisationStatus;
	/**
	 * `PRIVATE` : l'objet n'est pas public (morceau encore à l'état d'idée,
	 * collaboration entre ses parties). Seul l'acteur lui-même le voit.
	 */
	visibility: 'PUBLIC' | 'PRIVATE';
	/** Vrai pour une étape « première fois » (`Milestone`). */
	firstTime: boolean;
};

/**
 * Clé stable d'un fait, indépendante du contexte où on le voit. Une étape de
 * groupe est unique par groupe et par définition (`@@unique([bandId,
 * definitionId])`) : sa clé survit à un retrait puis à une redéclaration.
 */
export function realisationKey(kind: RealisationKind, object: RealisationObject): string {
	switch (object.type) {
		case 'WORK':
			return `work:${object.id}:${kind === 'PRODUCTION_STAGE' ? 'produced' : 'composed'}`;
		case 'WORK_ROLE':
			return `credit:${object.id}`;
		case 'COLLABORATION':
			return `collab:${object.id}`;
		case 'MILESTONE':
			return `milestone:${object.bandId}:${object.definitionId}`;
	}
}

const PROOF_RANK: Record<RealisationProof, number> = { DECLARED: 0, CORROBORATED: 1, VERIFIED: 2 };
/** En cas de doute, le statut le plus restrictif l'emporte. */
const STATUS_RANK: Record<RealisationStatus, number> = { ACTIVE: 0, FROZEN: 1, RETIRED: 2 };
const ROLE_ORDER: readonly RealisationRole[] = [
	'CREDITED',
	'PARTICIPANT',
	'PROVIDER',
	'HOST',
	'BAND_MEMBER'
];

function earliest(a: Date | null, b: Date | null) {
	if (!a) return b;
	if (!b) return a;
	return a.getTime() <= b.getTime() ? a : b;
}

/**
 * Une entrée par clé (NL3). Les rôles se cumulent ; la date retenue est la
 * plus ancienne ; la preuve, la plus haute ; le statut, le plus restrictif
 * (un fait gelé vu d'un côté reste gelé). L'ordre d'arrivée est conservé.
 */
export function dedupeRealisations(list: readonly Realisation[]): Realisation[] {
	const byKey = new Map<string, Realisation>();
	for (const r of list) {
		const seen = byKey.get(r.key);
		if (!seen) {
			byKey.set(r.key, { ...r, roles: sortRoles(r.roles) });
			continue;
		}
		byKey.set(r.key, {
			...seen,
			roles: sortRoles([...seen.roles, ...r.roles]),
			occurredAt: earliest(seen.occurredAt, r.occurredAt),
			proof: PROOF_RANK[r.proof] > PROOF_RANK[seen.proof] ? r.proof : seen.proof,
			status: STATUS_RANK[r.status] > STATUS_RANK[seen.status] ? r.status : seen.status,
			visibility:
				seen.visibility === 'PRIVATE' || r.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
			firstTime: seen.firstTime || r.firstTime
		});
	}
	return [...byKey.values()];
}

function sortRoles(roles: readonly RealisationRole[]) {
	return ROLE_ORDER.filter((role) => roles.includes(role));
}

/** Ne compte dans une épreuve qu'une réalisation active (ni gelée, ni retirée). */
export function countable(r: Realisation) {
	return r.status === 'ACTIVE';
}

/** Réalisations classées par branche (pour la carte parallèle, N2). */
export function byBranch(list: readonly Realisation[]) {
	const out = new Map<RealisationBranch, Realisation[]>();
	for (const r of list) out.set(r.branch, [...(out.get(r.branch) ?? []), r]);
	return out;
}

function milestoneCount(
	list: readonly Realisation[],
	definitionId: string,
	proofs: readonly RealisationProof[]
) {
	return list.filter(
		(r) =>
			r.kind === 'MILESTONE' &&
			r.object.type === 'MILESTONE' &&
			r.object.definitionId === definitionId &&
			countable(r) &&
			proofs.includes(r.proof)
	).length;
}

/**
 * Faits de la carte de carrière (`CareerFacts`) depuis les réalisations. Les
 * appréciations de jam et les collaborations viennent du résumé musicien
 * (`musicianSummary`), qui fait déjà foi pour le palier : on ne les recompte
 * pas ici, pour ne pas créer deux sources d'un même nombre.
 */
export function careerFactsOf(
	list: readonly Realisation[],
	summary: { jamAppreciations: number; collaborations: number }
): CareerFacts {
	const unique = dedupeRealisations(list);
	const composed = (proof: RealisationProof) =>
		unique.filter((r) => r.kind === 'WORK_COMPOSED' && countable(r) && r.proof === proof).length;
	return {
		jamAppreciations: summary.jamAppreciations,
		collaborations: summary.collaborations,
		worksTogether: composed('CORROBORATED'),
		worksSolo: composed('DECLARED'),
		recordings: milestoneCount(unique, 'FIRST_RECORDING', ['CORROBORATED', 'VERIFIED']),
		productions: unique.filter((r) => r.kind === 'PRODUCTION_STAGE' && countable(r)).length,
		verifiedGigs: milestoneCount(unique, 'FIRST_GIG', ['VERIFIED']),
		tours: milestoneCount(unique, 'FIRST_TOUR', ['VERIFIED'])
	};
}

/** Rôles crédités qui comptent sur la fiche : au moins corroborés, actifs. */
export function creditsOf(list: readonly Realisation[]) {
	return dedupeRealisations(list).filter(
		(r) => r.kind === 'CREDIT' && countable(r) && r.proof !== 'DECLARED'
	).length;
}

/**
 * Premier concert vérifié (carte souvenir de l'acte V) : l'étape active la
 * plus ancienne ; à date égale, l'ordre de lecture.
 */
export function firstVerifiedGigOf(list: readonly Realisation[]) {
	let first: Realisation | null = null;
	for (const r of dedupeRealisations(list)) {
		if (r.object.type !== 'MILESTONE' || r.object.definitionId !== 'FIRST_GIG') continue;
		if (!countable(r) || r.proof !== 'VERIFIED' || !r.occurredAt) continue;
		if (!first || r.occurredAt.getTime() < (first.occurredAt?.getTime() ?? Infinity)) first = r;
	}
	return first;
}
