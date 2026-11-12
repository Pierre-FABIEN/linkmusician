// LINKMUSICIAN: onboarding, étape « Intention » (P1-10). Dernière étape à
// remplir : marque la fin de l'onboarding (`Person.onboardedAt`).
import { redirect } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { onboardingFor } from '#lib/server/onboarding';
import { guardStep } from '#lib/server/onboarding-guard';
import { LOOKING_FOR, type LookingForValue } from '#lib/actors/profile';
import { stepPath } from '#lib/onboarding/steps';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const data = await parent();
	guardStep('intention', data);
	const person = await prisma.person.findUniqueOrThrow({
		where: { actorId: data.actorId },
		select: { lookingFor: true }
	});
	return { stepId: 'intention' as const, lookingFor: person.lookingFor };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const onboarding = await onboardingFor(locals.user!.id);
		if (!onboarding) redirect(303, '/bienvenue');
		// Pas d'enregistrement d'une étape future ou absente du parcours (ONB-02).
		guardStep('intention', onboarding);
		const chosen = (await request.formData())
			.getAll('lookingFor')
			.map(String)
			.filter((v): v is LookingForValue => (LOOKING_FOR as readonly string[]).includes(v));
		await prisma.person.update({
			where: { actorId: onboarding.person.actorId },
			data: { lookingFor: [...new Set(chosen)], onboardedAt: new Date() }
		});
		redirect(303, stepPath('resultat'));
	}
};
