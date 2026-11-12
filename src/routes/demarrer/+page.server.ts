// LINKMUSICIAN: point d'entrée de l'onboarding : renvoie vers l'étape à faire
// (le récapitulatif quand tout est rempli, ONB-12a), ou vers l'espace.
import { redirect } from '@sveltejs/kit';
import { stepPath } from '#lib/onboarding/steps';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { step } = await parent();
	if (step) redirect(302, stepPath(step));
	redirect(302, '/jouer');
};
