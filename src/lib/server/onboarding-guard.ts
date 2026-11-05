/**
 * Garde d'une étape d'onboarding : une étape future renvoie vers l'étape à
 * faire (on ne saute pas d'étape), une fois l'onboarding fini on va à l'espace.
 */
import { redirect } from '@sveltejs/kit';
import {
	canVisit,
	stepPath,
	type OnboardingState,
	type OnboardingStepId
} from '#lib/onboarding/steps';

export function guardStep(
	id: OnboardingStepId,
	data: { state: OnboardingState; step: Exclude<OnboardingStepId, 'resultat'> | null }
) {
	if (!canVisit(id, data.state)) redirect(302, data.step ? stepPath(data.step) : '/jouer');
}
