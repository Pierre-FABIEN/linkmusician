// LINKMUSICIAN: point d'entrée de l'onboarding : renvoie vers l'étape à faire.
import { redirect } from '@sveltejs/kit';
import { stepPath } from '#lib/onboarding/steps';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { step } = await parent();
	redirect(302, step ? stepPath(step) : '/jouer');
};
