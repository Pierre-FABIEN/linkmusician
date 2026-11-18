/**
 * Projets (P2, D72 révision 2) : règles pures, partagées par le serveur et le
 * navigateur. Conception 19 §2.3, §5.4 (I1 à I12), §6.2 et §9.3.
 *
 * Un projet regroupe sans posséder (I1), ne prouve rien (I3) et reste
 * facultatif (I4). Ce qu'un élément révèle à qui ne le gère pas dépend de
 * son niveau de partage, choisi par la gestion de l'élément (I6).
 */

export const PROJECT_KINDS = [
	'SINGLE',
	'EP',
	'ALBUM',
	'PRODUCTION',
	'CONCERT',
	'TOUR',
	'FESTIVAL',
	'CAMPAIGN'
] as const;
export type ProjectKindValue = (typeof PROJECT_KINDS)[number];

export const PROJECT_KIND_LABELS: Record<ProjectKindValue, string> = {
	SINGLE: 'Single',
	EP: 'EP',
	ALBUM: 'Album',
	PRODUCTION: 'Production',
	CONCERT: 'Concert',
	TOUR: 'Tournée',
	FESTIVAL: 'Festival',
	CAMPAIGN: 'Campagne'
};

/** Organisations qui portent un projet au lancement (Q-G0-13). */
export const PROJECT_OWNER_ORG_KINDS = ['BAND', 'PROMOTER', 'STUDIO', 'VENUE'] as const;
export type ProjectOwnerOrgKind = (typeof PROJECT_OWNER_ORG_KINDS)[number];

/** Personne, ou une des quatre organisations admises ; jamais école ni agence. */
export function isAllowedOwner(actorKind: string, orgKind?: string | null): boolean {
	if (actorKind === 'PERSON') return true;
	return (
		actorKind === 'ORGANIZATION' &&
		(PROJECT_OWNER_ORG_KINDS as readonly string[]).includes(orgKind ?? '')
	);
}

export const PROJECT_STATUSES = ['ACTIVE', 'DONE', 'ABANDONED'] as const;
export type ProjectStatusValue = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatusValue, string> = {
	ACTIVE: 'En cours',
	DONE: 'Atteint',
	ABANDONED: 'Laissé de côté'
};

/** En cours → atteint ou laissé de côté ; un projet clos se rouvre. */
export function canTransition(from: ProjectStatusValue, to: ProjectStatusValue): boolean {
	if (from === to) return false;
	return from === 'ACTIVE' || to === 'ACTIVE';
}

export const PROJECT_SHARES = ['NONE', 'SUMMARY', 'WORK'] as const;
export type ProjectShareValue = (typeof PROJECT_SHARES)[number];

/** Vocabulaire à l'écran (conception 20 §9.1). */
export const SHARE_LABELS: Record<ProjectShareValue, string> = {
	NONE: 'Rien',
	SUMMARY: 'Résumé',
	WORK: 'Travail'
};

export const SHARE_PHRASES: Record<ProjectShareValue, string> = {
	NONE: 'Rangé ici pour toi. Les autres participant·es ne le voient pas et ne savent pas qu’il existe.',
	SUMMARY:
		'Son titre (ou le titre affiché) et son état. Ni la maquette, ni les notes, ni les crédits.',
	WORK: 'Le résumé, plus les étapes de ce projet. Le morceau reste à toi : titre, crédits et maquette ne changent pas.'
};

const SHARE_RANK: Record<ProjectShareValue, number> = { NONE: 0, SUMMARY: 1, WORK: 2 };

/** Partage proposé au rangement : public → résumé, privé → rien ; jamais
 * « Travail », qui reste un choix explicite (§9.3). */
export function defaultShare(work: { state: string }): Exclude<ProjectShareValue, 'WORK'> {
	return work.state === 'COMPOSED' ? 'SUMMARY' : 'NONE';
}

export function isLowering(from: ProjectShareValue, to: ProjectShareValue): boolean {
	return SHARE_RANK[to] < SHARE_RANK[from];
}

/** Abaisser un partage protège : toujours permis. L'élargir suppose un
 * projet en cours (un projet clos est en lecture). */
export function canChangeShare(
	status: ProjectStatusValue,
	from: ProjectShareValue,
	to: ProjectShareValue
): boolean {
	if (from === to) return false;
	return isLowering(from, to) || status === 'ACTIVE';
}

/**
 * Ce qu'un lecteur voit d'un élément (I6) :
 * - `full` : il gère le morceau, par ses propres droits ;
 * - `summary` : partagé (résumé ou travail) et encore lisible (porteur vivant,
 *   aucun blocage entre le lecteur et le porteur) ;
 * - `hidden` : rien, pas même son existence (compteurs et journal compris).
 */
export type ItemVisibility = 'full' | 'summary' | 'hidden';

export function itemVisibility(input: {
	managed: boolean;
	share: ProjectShareValue;
	readable: boolean;
}): ItemVisibility {
	if (input.managed) return 'full';
	if (input.share === 'NONE' || !input.readable) return 'hidden';
	return 'summary';
}

/** Titre montré : le vrai pour la gestion du morceau ; sinon le titre de
 * travail s'il y en a un, à la place du titre. */
export function displayTitle(
	visibility: Exclude<ItemVisibility, 'hidden'>,
	title: string,
	workingTitle: string | null
): string {
	if (visibility === 'full') return title;
	return workingTitle?.trim() || title;
}

/** Un acte sur un élément n'est montré qu'à qui voit encore l'élément ; les
 * actes du projet lui-même, à toute personne qui lit la fiche. */
export function actVisible(act: { workId: string | null }, visibleWorkIds: ReadonlySet<string>) {
	return act.workId === null || visibleWorkIds.has(act.workId);
}

// Quotas anti-abus (aucune limite fonctionnelle, conception 19 §5.3). La
// conception ne donne pas de chiffre : défauts consignés en Q76.
export const MAX_ACTIVE_PROJECTS = 20;
export const MAX_PROJECTS_PER_OWNER = 200;
export const MAX_ITEMS_PER_PROJECT = 200;

export const MAX_PROJECT_NAME = 80;
export const MIN_PROJECT_NAME = 2;
export const MAX_PROJECT_DESCRIPTION = 500;
export const MAX_WORKING_TITLE = 80;

export type QuotaRefusal = 'active' | 'total' | null;

export function projectQuota(counts: { active: number; total: number }): QuotaRefusal {
	if (counts.total >= MAX_PROJECTS_PER_OWNER) return 'total';
	if (counts.active >= MAX_ACTIVE_PROJECTS) return 'active';
	return null;
}

export const QUOTA_MESSAGES: Record<Exclude<QuotaRefusal, null>, string> = {
	active: `${MAX_ACTIVE_PROJECTS} projets en cours au plus : termine ou laisse de côté un projet pour en ouvrir un nouveau.`,
	total: `${MAX_PROJECTS_PER_OWNER} projets au plus : supprime un ancien projet pour en créer un nouveau.`
};

export function itemsQuotaReached(count: number): boolean {
	return count >= MAX_ITEMS_PER_PROJECT;
}
