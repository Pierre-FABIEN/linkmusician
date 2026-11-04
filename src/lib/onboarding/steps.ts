/**
 * Onboarding (P1-10, conception 05 §1) : 6 écrans après la vérification de
 * l'email. L'étape courante **se déduit du profil** (métiers, instruments,
 * genres, ville) ; seul le passage de l'intention est mémorisé
 * (`Person.onboardedAt`), car « juste explorer » ne laisse pas de trace.
 * Module pur.
 */

export const ONBOARDING_STEPS = [
	{ id: 'metiers', path: '/qui-es-tu', label: 'Qui es-tu ?' },
	{ id: 'instruments', path: '/demarrer/instruments', label: 'Instruments' },
	{ id: 'genres', path: '/demarrer/genres', label: 'Genres' },
	{ id: 'ville', path: '/demarrer/ville', label: 'Ville' },
	{ id: 'intention', path: '/demarrer/intention', label: 'Intention' },
	{ id: 'resultat', path: '/demarrer/resultat', label: 'Près de toi' }
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id'];

export type OnboardingState = {
	hasTracks: boolean;
	instrumentCount: number;
	genreCount: number;
	hasZone: boolean;
	onboarded: boolean;
};

/**
 * Première étape à faire, ou `null` si l'onboarding est terminé. Le « premier
 * résultat » n'est pas une étape à remplir : on y arrive après l'intention.
 */
export function currentStep(state: OnboardingState): Exclude<OnboardingStepId, 'resultat'> | null {
	if (!state.hasTracks) return 'metiers';
	if (state.instrumentCount === 0) return 'instruments';
	if (state.genreCount === 0) return 'genres';
	if (!state.hasZone) return 'ville';
	if (!state.onboarded) return 'intention';
	return null;
}

export function stepPath(id: OnboardingStepId): string {
	return ONBOARDING_STEPS.find((s) => s.id === id)!.path;
}

/** Numéro de l'écran (1 à 6), pour la barre d'étapes. */
export function stepNumber(id: OnboardingStepId): number {
	return ONBOARDING_STEPS.findIndex((s) => s.id === id) + 1;
}

/** Une étape déjà faite ou en cours est accessible ; pas une étape future. */
export function canVisit(id: OnboardingStepId, state: OnboardingState): boolean {
	const current = currentStep(state);
	if (id === 'resultat') return current === null;
	if (current === null) return true;
	return stepNumber(id) <= stepNumber(current);
}

/** Instruments proposés à l'onboarding (la page « Mon profil musical » va jusqu'à 5). */
export const ONBOARDING_MAX_INSTRUMENTS = 3;
