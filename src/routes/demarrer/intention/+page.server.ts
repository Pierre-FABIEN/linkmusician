// LINKMUSICIAN: onboarding, dernier écran du métier musicien·ne (P1-10,
// ONB-03) : « Ton profil de musicien·ne ». Expérience et engagement requis ;
// « Je recherche », « Je propose », écriture et précisions facultatifs.
// L'enregistrer termine l'onboarding (`Person.onboardedAt`).
import { redirect } from '@sveltejs/kit';
import { onboardingFor, redirectAfterStep } from '#lib/server/onboarding';
import { guardStep } from '#lib/server/onboarding-guard';
import { musicianStepData, submitMusicianStep } from '#lib/server/musician/step';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const data = await parent();
	guardStep('intention', data);
	return { stepId: 'intention' as const, ...(await musicianStepData(data.actorId)) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const onboarding = await onboardingFor(locals.user!.id);
		if (!onboarding) redirect(303, '/bienvenue');
		// Pas d'enregistrement d'une étape future ou absente du parcours (ONB-02).
		guardStep('intention', onboarding);
		const actorId = onboarding.person.actorId;
		const result = await submitMusicianStep(request, actorId, { finishOnboarding: true });
		if ('failure' in result) return result.failure;
		return redirectAfterStep(actorId, 'intention');
	}
};
