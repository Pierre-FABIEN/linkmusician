/**
 * LINKMUSICIAN: onboarding, étape d'un métier (ONB-02, D57, D59) :
 * spécialités, « Je propose », « Je recherche », puis les champs propres du
 * métier. Une étape par métier choisi autre que musicien·ne.
 *
 * Valider l'étape la marque faite (`PersonTrack.detailsConfirmedAt`), même
 * sans rien cocher pour un métier « bientôt » (D15).
 */
import { redirect } from '@sveltejs/kit';
import { stepPath, trackStepId } from '#lib/onboarding/steps';
import { onboardingFor, redirectAfterStep } from '#lib/server/onboarding';
import { guardStep } from '#lib/server/onboarding-guard';
import { stepTrackOf, submitTrackStep, trackStepData } from '#lib/server/actors/trackStep';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params }) => {
	const data = await parent();
	const track = stepTrackOf(params.slug);
	if (!track) redirect(302, data.step ? stepPath(data.step) : '/jouer');
	guardStep(trackStepId(track), data);
	return { stepId: trackStepId(track), ...(await trackStepData(data.actorId, track)) };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const onboarding = await onboardingFor(locals.user!.id);
		if (!onboarding) redirect(303, '/bienvenue');
		const track = stepTrackOf(params.slug);
		if (!track) redirect(303, onboarding.step ? stepPath(onboarding.step) : '/jouer');
		guardStep(trackStepId(track), onboarding);

		const actorId = onboarding.person.actorId;
		const result = await submitTrackStep(request, actorId, track, { confirm: true });
		if ('failure' in result && result.failure) {
			if (result.failure.status === 403) redirect(303, '/qui-es-tu');
			return result.failure;
		}
		return redirectAfterStep(actorId, trackStepId(track));
	}
};
