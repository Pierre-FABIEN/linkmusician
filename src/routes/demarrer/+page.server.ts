// LINKMUSICIAN: point d'entrée de l'onboarding : renvoie vers l'étape à faire.
// Tout rempli sans étape « intention » (pas de métier musicien·ne, ou retiré
// en cours de route) : l'onboarding se termine ici (ONB-02).
import { redirect } from '@sveltejs/kit';
import { stepPath } from '#lib/onboarding/steps';
import { finishIfComplete } from '#lib/server/onboarding';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { step, state, actorId } = await parent();
	if (step) redirect(302, stepPath(step));
	if (!state.onboarded && (await finishIfComplete(actorId))) redirect(302, stepPath('resultat'));
	redirect(302, '/jouer');
};
