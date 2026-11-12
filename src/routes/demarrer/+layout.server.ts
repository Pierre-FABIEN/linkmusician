/**
 * LINKMUSICIAN: onboarding (P1-10). Compte connecté et vérifié, personne
 * créée ; l'étape courante se déduit du profil (`#lib/onboarding/steps`).
 */
import { redirect } from '@sveltejs/kit';
import { onboardingFor } from '#lib/server/onboarding';
import { onboardingSteps } from '#lib/onboarding/steps';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) redirect(302, '/auth/login');
	if (!user.emailVerified) redirect(302, '/auth/verify-email');
	const onboarding = await onboardingFor(user.id);
	if (!onboarding) redirect(302, '/bienvenue');
	return {
		actorId: onboarding.person.actorId,
		state: onboarding.state,
		step: onboarding.step,
		/** Étapes de cette personne (ONB-02), pour la barre d'étapes. */
		steps: onboardingSteps(onboarding.state)
	};
};
