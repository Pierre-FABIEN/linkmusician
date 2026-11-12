/**
 * Onboarding adaptatif (P1-10, ONB-02, D57). Les étapes se calculent à
 * partir des métiers choisis, et l'étape courante **se déduit du profil**
 * (métiers, instruments, genres, ville, confirmation de chaque métier).
 * Seule la fin de l'onboarding est mémorisée (`Person.onboardedAt`).
 * Module pur.
 *
 *   metiers → [instruments si musicien·ne] → genres → ville
 *           → une étape par autre métier (principal d'abord)
 *           → [intention si musicien·ne] → resultat
 *
 * Musicien·ne seul·e : les 6 écrans d'origine, inchangés. Aucun autre
 * métier ne demande d'instrument. Les informations communes (genres, ville)
 * ne sont demandées qu'une fois.
 */
import { TRACK_KINDS, TRACKS, type TrackKindValue } from '#lib/actors/tracks';
import { TRACK_ROLES } from '#lib/actors/roles';

export { minSpecializations, trackOfSlug } from '#lib/actors/roles';

type FixedStepId = 'metiers' | 'instruments' | 'genres' | 'ville' | 'intention' | 'resultat';
export type TrackStepId = `metier:${TrackKindValue}`;
export type OnboardingStepId = FixedStepId | TrackStepId;
/** Étape à remplir (le « premier résultat » n'en est pas une). */
export type FillStepId = Exclude<OnboardingStepId, 'resultat'>;

export type OnboardingStep = {
	id: OnboardingStepId;
	path: string;
	label: string;
	/** Étape d'un métier : lequel. */
	track?: TrackKindValue;
};

const FIXED: Readonly<Record<FixedStepId, OnboardingStep>> = {
	metiers: { id: 'metiers', path: '/qui-es-tu', label: 'Qui es-tu ?' },
	instruments: { id: 'instruments', path: '/demarrer/instruments', label: 'Instruments' },
	genres: { id: 'genres', path: '/demarrer/genres', label: 'Genres' },
	ville: { id: 'ville', path: '/demarrer/ville', label: 'Ville' },
	intention: { id: 'intention', path: '/demarrer/intention', label: 'Intention' },
	resultat: { id: 'resultat', path: '/demarrer/resultat', label: 'Près de toi' }
};

export const trackStepId = (track: TrackKindValue): TrackStepId => `metier:${track}`;

function trackStep(track: TrackKindValue): OnboardingStep {
	return {
		id: trackStepId(track),
		path: `/demarrer/metier/${TRACK_ROLES[track].slug}`,
		label: TRACKS[track].label,
		track
	};
}

export type OnboardingState = {
	/** Métiers choisis, et le principal. */
	tracks: readonly TrackKindValue[];
	primary: TrackKindValue | null;
	/** Métiers dont l'étape a été validée (`PersonTrack.detailsConfirmedAt`). */
	confirmedTracks: readonly TrackKindValue[];
	instrumentCount: number;
	genreCount: number;
	hasZone: boolean;
	onboarded: boolean;
};

/**
 * Un écran commun à certains métiers (instruments, intention) est demandé
 * si l'un des métiers choisis le demande ; sans métier choisi, on montre le
 * parcours musicien·ne.
 */
function asks(state: OnboardingState, screen: 'instruments' | 'intention'): boolean {
	if (state.tracks.length === 0) return TRACK_ROLES.MUSICIAN.onboarding[screen];
	return state.tracks.some((t) => TRACK_ROLES[t].onboarding[screen]);
}

/**
 * Métiers qui ont leur propre étape (`TRACK_ROLES[…].onboarding.ownStep`),
 * principal d'abord, puis dans l'ordre du référentiel.
 */
export function stepTracks(state: OnboardingState): TrackKindValue[] {
	const own = TRACK_KINDS.filter(
		(t) => TRACK_ROLES[t].onboarding.ownStep && state.tracks.includes(t)
	);
	return [...own].sort((a, b) => Number(b === state.primary) - Number(a === state.primary));
}

/** Étapes de cette personne, dans l'ordre. Sans métier : le parcours musicien·ne. */
export function onboardingSteps(state: OnboardingState): OnboardingStep[] {
	return [
		FIXED.metiers,
		...(asks(state, 'instruments') ? [FIXED.instruments] : []),
		FIXED.genres,
		FIXED.ville,
		...stepTracks(state).map(trackStep),
		...(asks(state, 'intention') ? [FIXED.intention] : []),
		FIXED.resultat
	];
}

function isDone(step: OnboardingStep, state: OnboardingState): boolean {
	if (step.track) return state.confirmedTracks.includes(step.track);
	switch (step.id) {
		case 'metiers':
			return state.tracks.length > 0;
		case 'instruments':
			return state.instrumentCount > 0;
		case 'genres':
			return state.genreCount > 0;
		case 'ville':
			return state.hasZone;
		case 'intention':
			return state.onboarded;
		default:
			return true;
	}
}

/** Première étape réellement incomplète, ou `null` si tout est fait. */
export function currentStep(state: OnboardingState): FillStepId | null {
	const step = onboardingSteps(state).find((s) => s.id !== 'resultat' && !isDone(s, state));
	return (step?.id as FillStepId | undefined) ?? null;
}

/**
 * Tout est rempli mais l'onboarding n'est pas marqué fini : cas d'une
 * personne sans métier musicien·ne (pas d'étape « intention ») après sa
 * dernière étape, ou qui a retiré ce métier en cours de route.
 */
export function readyToFinish(state: OnboardingState): boolean {
	return !state.onboarded && currentStep(state) === null;
}

export function stepById(state: OnboardingState, id: OnboardingStepId): OnboardingStep | null {
	return onboardingSteps(state).find((s) => s.id === id) ?? null;
}

export function stepPath(id: OnboardingStepId): string {
	if (id.startsWith('metier:')) return trackStep(id.slice(7) as TrackKindValue).path;
	return FIXED[id as FixedStepId].path;
}

/** Numéro de l'écran (1 à N), 0 si l'étape n'est pas dans ce parcours. */
export function stepNumber(id: OnboardingStepId, state: OnboardingState): number {
	return onboardingSteps(state).findIndex((s) => s.id === id) + 1;
}

/**
 * Une étape déjà faite ou en cours est accessible ; pas une étape future, ni
 * l'étape d'un métier non choisi. Le résultat, une fois tout rempli.
 */
export function canVisit(id: OnboardingStepId, state: OnboardingState): boolean {
	const n = stepNumber(id, state);
	if (n === 0) return false;
	const current = currentStep(state);
	if (id === 'resultat') return current === null;
	if (current === null) return true;
	return n <= stepNumber(current, state);
}

/** Adresse de l'étape précédente dans ce parcours (bouton « Retour »). */
export function previousStepPath(
	steps: readonly OnboardingStep[],
	id: OnboardingStepId
): string | null {
	const i = steps.findIndex((s) => s.id === id);
	return i > 0 ? steps[i - 1].path : null;
}

/**
 * Où aller après avoir enregistré l'étape `from` : l'étape suivante du
 * parcours si elle est accessible, sinon la première étape manquante (un
 * retour en arrière ne fait pas sauter d'étape). Tout fait : le résultat.
 */
export function stepAfter(from: OnboardingStepId, state: OnboardingState): OnboardingStepId {
	const steps = onboardingSteps(state);
	const next = steps[steps.findIndex((s) => s.id === from) + 1];
	if (next && canVisit(next.id, state)) return next.id;
	return currentStep(state) ?? 'resultat';
}

export const TRACK_STEP_MESSAGES = {
	specializations: 'Choisis au moins une spécialité.'
} as const;

/** Instruments proposés à l'onboarding (la page « Mon profil musical » va jusqu'à 5). */
export const ONBOARDING_MAX_INSTRUMENTS = 3;
