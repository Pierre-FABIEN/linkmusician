/**
 * LINKMUSICIAN: onboarding, récapitulatif (ONB-12a). Relit chaque étape
 * (métiers, informations communes, chaque métier) avec un lien pour y
 * revenir ; tout est déjà enregistré. Valider termine l'onboarding
 * (`Person.onboardedAt`), puis mène au premier résultat.
 */
import { redirect } from '@sveltejs/kit';
import { stepPath } from '#lib/onboarding/steps';
import { recapSections } from '#lib/onboarding/recap';
import { finishOnboarding, onboardingFor } from '#lib/server/onboarding';
import { guardStep } from '#lib/server/onboarding-guard';
import { recapInputOf } from '#lib/server/onboarding-recap';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const data = await parent();
	guardStep('recap', data);
	return {
		stepId: 'recap' as const,
		sections: recapSections(data.steps, await recapInputOf(data.actorId))
	};
};

export const actions: Actions = {
	default: async ({ locals }) => {
		const onboarding = await onboardingFor(locals.user!.id);
		if (!onboarding) redirect(303, '/bienvenue');
		guardStep('recap', onboarding);
		// L'état est relu par `finishOnboarding` : une étape manquante y renvoie.
		if (!(await finishOnboarding(onboarding.person.actorId)))
			redirect(303, onboarding.step ? stepPath(onboarding.step) : '/demarrer');
		redirect(303, stepPath('resultat'));
	}
};
