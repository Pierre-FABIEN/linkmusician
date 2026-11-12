// LINKMUSICIAN: onboarding, étape « Ville » et rayon de déplacement (P1-10).
import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { getCommune } from '#lib/server/geo/communes';
import { getActorLocation, setActorLocation } from '#lib/server/geo/queries';
import { onProfileChanged } from '#lib/server/progression/profile';
import { onboardingFor, redirectAfterStep, DEFAULT_RADIUS_KM } from '#lib/server/onboarding';
import { guardStep } from '#lib/server/onboarding-guard';
import { isTravelRadius } from '#lib/actors/profile';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const data = await parent();
	guardStep('ville', data);
	const [location, person] = await Promise.all([
		getActorLocation(data.actorId),
		prisma.person.findUniqueOrThrow({
			where: { actorId: data.actorId },
			select: { travelRadiusKm: true }
		})
	]);
	return { stepId: 'ville' as const, location, radius: person.travelRadiusKm ?? DEFAULT_RADIUS_KM };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const onboarding = await onboardingFor(locals.user!.id);
		if (!onboarding) redirect(303, '/bienvenue');
		// Pas d'enregistrement d'une étape future ou absente du parcours (ONB-02).
		guardStep('ville', onboarding);
		const data = await request.formData();
		const radius = Number(data.get('radius'));
		const code = String(data.get('communeCode') ?? '');
		const actorId = onboarding.person.actorId;
		if (!isTravelRadius(radius)) return fail(400, { error: 'Choisis un rayon dans la liste.' });
		if (code) {
			let commune;
			try {
				commune = await getCommune(code);
			} catch {
				return fail(502, {
					error: 'Le service des communes ne répond pas. Réessaie dans un instant.'
				});
			}
			if (!commune) return fail(400, { error: 'Choisis une commune dans la liste.' });
			await setActorLocation(actorId, commune);
		} else if (!(await getActorLocation(actorId))) {
			return fail(400, { error: 'Choisis ta commune dans la liste.' });
		}
		await prisma.person.update({ where: { actorId }, data: { travelRadiusKm: radius } });
		await onProfileChanged(actorId);
		return redirectAfterStep(onboarding.person.actorId, 'ville');
	}
};
