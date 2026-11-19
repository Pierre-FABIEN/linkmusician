/**
 * Besoins d'un projet (U3b, D76, conception 22) : règles pures.
 *
 * Un besoin dit ce qui manque au projet (un métier, une précision, une
 * phrase). Il ne donne aucun droit, ne contacte personne, ne prouve rien
 * (I1, I3) ; une proposition est un besoin `PROPOSED`, que seule la gestion
 * ouvre ou refuse. Ces règles décident de ce que l'écran propose ; le
 * serveur les relit sous verrou à chaque écriture (N5).
 */
import { SOUND_SPECIALTIES, SOUND_SPECIALTY_INFO } from '#lib/crafts/sound';
import { PRODUCER_SPECIALTIES, PRODUCER_SPECIALTY_INFO } from '#lib/crafts/producer';
import { SPECIALTY_SLUGS, type SearchSpecialty } from '#lib/search/filters';
import type { ProjectRoleValue } from './participants';

/** Les six métiers que la recherche sait trouver (Q95). */
export const NEED_TRACKS = [
	'MUSICIAN',
	'SOUND_ENGINEER',
	'PRODUCER',
	'PROMOTER',
	'MANAGER',
	'BOOKER'
] as const;
export type NeedTrackValue = (typeof NEED_TRACKS)[number];

export const NEED_TRACK_LABELS: Readonly<Record<NeedTrackValue, string>> = {
	MUSICIAN: 'Musicien·ne',
	SOUND_ENGINEER: 'Ingé son',
	PRODUCER: 'Producteur·rice',
	PROMOTER: 'Organisateur·rice',
	MANAGER: 'Manager',
	BOOKER: 'Booker'
};

/** Slug du métier dans `/decouvrir?metier=` (`SEARCH_TRACKS`). */
const SEARCH_SLUGS: Readonly<Record<NeedTrackValue, string>> = {
	MUSICIAN: 'musicien',
	SOUND_ENGINEER: 'inge-son',
	PRODUCER: 'producteur',
	PROMOTER: 'organisateur',
	MANAGER: 'manager',
	BOOKER: 'booker'
};

/** Spécialités qu'un métier peut préciser ; l'instrument précise un·e musicien·ne. */
export const NEED_SPECIALTIES: Readonly<
	Record<NeedTrackValue, readonly { id: string; label: string }[]>
> = {
	MUSICIAN: [],
	SOUND_ENGINEER: SOUND_SPECIALTIES.map((id) => ({ id, label: SOUND_SPECIALTY_INFO[id].label })),
	PRODUCER: PRODUCER_SPECIALTIES.map((id) => ({ id, label: PRODUCER_SPECIALTY_INFO[id].label })),
	PROMOTER: [],
	MANAGER: [],
	BOOKER: []
};

export const isNeedTrack = (v: string): v is NeedTrackValue =>
	(NEED_TRACKS as readonly string[]).includes(v);

export function specialtyAllowed(track: NeedTrackValue, specialty: string | null) {
	return specialty === null || NEED_SPECIALTIES[track].some((s) => s.id === specialty);
}

/** « Ingé son · Prise de son », « Musicien·ne · Basse ». */
export function needLabel(
	track: NeedTrackValue,
	specialty: string | null,
	instrument: string | null
) {
	const precise =
		NEED_SPECIALTIES[track].find((s) => s.id === specialty)?.label ??
		(track === 'MUSICIAN' ? instrument : null);
	return precise ? `${NEED_TRACK_LABELS[track]} · ${precise}` : NEED_TRACK_LABELS[track];
}

/** « Trouver un pro » : la recherche préremplie, rien d'envoyé (P12). */
export function needSearchHref(
	track: NeedTrackValue,
	specialty: string | null,
	instrumentSlug: string | null
) {
	const params = new URLSearchParams({ metier: SEARCH_SLUGS[track] });
	const slug = specialty ? SPECIALTY_SLUGS[specialty as SearchSpecialty] : undefined;
	if (slug) params.set('specialite', slug);
	if (track === 'MUSICIAN' && instrumentSlug) params.set('instrument', instrumentSlug);
	return `/decouvrir?${params.toString()}`;
}

export const NEED_STATUSES = ['PROPOSED', 'OPEN', 'FILLED', 'DECLINED', 'CANCELLED'] as const;
export type NeedStatusValue = (typeof NEED_STATUSES)[number];

export const NEED_STATUS_LABELS: Readonly<Record<NeedStatusValue, string>> = {
	PROPOSED: 'Proposé',
	OPEN: 'Ouvert',
	FILLED: 'Pourvu',
	DECLINED: 'Non retenu',
	CANCELLED: 'Annulé'
};

/** Ouvert ou proposé : compte dans le quota du projet. */
export const LIVE_NEED_STATUSES = ['PROPOSED', 'OPEN'] as const;

/** Les gestes d'un besoin, en intentions (le client n'envoie jamais un état). */
export type NeedIntent = 'update' | 'withdraw' | 'open' | 'decline' | 'fill' | 'reopen' | 'cancel';

/** État d'arrivée de chaque intention, depuis l'état où elle s'applique. */
const TRANSITIONS: Readonly<Record<NeedIntent, readonly [NeedStatusValue, NeedStatusValue][]>> = {
	update: [
		['PROPOSED', 'PROPOSED'],
		['OPEN', 'OPEN']
	],
	withdraw: [['PROPOSED', 'CANCELLED']],
	open: [['PROPOSED', 'OPEN']],
	decline: [['PROPOSED', 'DECLINED']],
	fill: [['OPEN', 'FILLED']],
	reopen: [['FILLED', 'OPEN']],
	cancel: [['OPEN', 'CANCELLED']]
};

/** État d'arrivée, ou `null` si l'intention ne s'applique pas à cet état. */
export function needTransition(intent: NeedIntent, from: NeedStatusValue): NeedStatusValue | null {
	return TRANSITIONS[intent].find(([a]) => a === from)?.[1] ?? null;
}

/**
 * Qui peut faire quoi (conception 22 §5). `role` : rôle relu par
 * `projectAccess` ; `author` : la personne a formulé ce besoin ; `open` :
 * projet en cours et porteur vivant. Retirer sa proposition reste possible
 * sur un projet clos (une protection l'emporte toujours).
 */
export function canNeed(
	intent: NeedIntent,
	input: {
		role: ProjectRoleValue | null;
		author: boolean;
		status: NeedStatusValue;
		open: boolean;
	}
): boolean {
	if (!needTransition(intent, input.status)) return false;
	const manage = input.role === 'manage';
	const coordinate = input.role === 'coordinate';
	if (intent === 'withdraw') return input.author;
	if (!input.open) return false;
	switch (intent) {
		case 'update':
			return input.status === 'PROPOSED' ? manage || (coordinate && input.author) : manage;
		case 'open':
		case 'decline':
		case 'cancel':
			return manage;
		case 'fill':
		case 'reopen':
			return manage || coordinate;
	}
	return false;
}

/** Les intentions qu'un écran peut proposer pour ce besoin. */
export function needActions(input: Parameters<typeof canNeed>[1]): NeedIntent[] {
	const all: NeedIntent[] = ['open', 'decline', 'update', 'withdraw', 'fill', 'reopen', 'cancel'];
	return all.filter((intent) => canNeed(intent, input));
}

/** Ajouter un besoin : la gestion l'ouvre, la coordination le propose. */
export function statusOnAdd(role: ProjectRoleValue | null): NeedStatusValue | null {
	if (role === 'manage') return 'OPEN';
	if (role === 'coordinate') return 'PROPOSED';
	return null;
}

/**
 * Ce qu'un rôle voit (§5) : besoins ouverts et pourvus pour toute personne
 * qui lit la fiche ; propositions en attente et non retenues pour la
 * gestion, et pour leur auteur·rice. Les annulés ne s'affichent pas sur la
 * fiche.
 */
export function needVisible(input: {
	role: ProjectRoleValue | null;
	author: boolean;
	status: NeedStatusValue;
}): boolean {
	if (input.status === 'OPEN' || input.status === 'FILLED') return input.role !== null;
	if (input.status === 'PROPOSED' || input.status === 'DECLINED') {
		return input.role === 'manage' || (input.author && input.role !== null);
	}
	return false;
}

// Quotas anti-abus (Q93, D76).
export const MAX_LIVE_NEEDS_PER_PROJECT = 20;
export const MAX_PENDING_PROPOSALS_PER_AUTHOR = 5;
export const MAX_NEEDS_PER_DAY = 30;
export const MAX_NEED_DESCRIPTION = 280;

export type NeedQuotaRefusal = 'project' | 'author' | 'day' | null;

export function needQuota(input: {
	live: number;
	pendingByAuthor: number;
	createdToday: number;
	status: NeedStatusValue;
}): NeedQuotaRefusal {
	if (input.createdToday >= MAX_NEEDS_PER_DAY) return 'day';
	if (input.live >= MAX_LIVE_NEEDS_PER_PROJECT) return 'project';
	if (input.status === 'PROPOSED' && input.pendingByAuthor >= MAX_PENDING_PROPOSALS_PER_AUTHOR)
		return 'author';
	return null;
}

export const NEED_QUOTA_MESSAGES: Readonly<Record<Exclude<NeedQuotaRefusal, null>, string>> = {
	project: `${MAX_LIVE_NEEDS_PER_PROJECT} besoins ouverts ou proposés au plus : marques-en un pourvu ou annule-le.`,
	author: `${MAX_PENDING_PROPOSALS_PER_AUTHOR} propositions en attente au plus : attends la réponse de la gestion.`,
	day: `${MAX_NEEDS_PER_DAY} besoins par jour au plus : reprends demain.`
};

/** Phrase du bouton d'ajout, selon le rôle (§8.2). */
export function addLabel(role: ProjectRoleValue | null) {
	return role === 'manage' ? 'Ajouter' : 'Proposer à la gestion';
}
