// LINKMUSICIAN: onboarding, étape « Instruments » (P1-10).
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { prisma } from '#lib/server';
import { listInstrumentsByFamily } from '#lib/prisma/skills/referentials';
import { saveInstruments, UnknownReferenceError } from '#lib/prisma/skills/musicalProfile';
import { onProfileChanged } from '#lib/server/progression/profile';
import { onboardingFor, redirectAfterStep } from '#lib/server/onboarding';
import { guardStep } from '#lib/server/onboarding-guard';
import { checkInstrumentsInput, MUSICAL_PROFILE_MESSAGES } from '#lib/skills/profile';
import { ONBOARDING_MAX_INSTRUMENTS } from '#lib/onboarding/steps';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const data = await parent();
	guardStep('instruments', data);
	const [families, current] = await Promise.all([
		listInstrumentsByFamily(),
		prisma.personInstrument.findMany({
			where: { personId: data.actorId },
			select: { instrumentId: true, declaredLevel: true, isPrimary: true }
		})
	]);
	return {
		stepId: 'instruments' as const,
		families,
		current: current.map((c) => ({
			instrumentId: c.instrumentId,
			level: c.declaredLevel,
			isPrimary: c.isPrimary
		}))
	};
};

const payloadSchema = z.object({
	instruments: z
		.array(z.object({ instrumentId: z.string(), level: z.number().int() }))
		.max(ONBOARDING_MAX_INSTRUMENTS),
	primaryInstrumentId: z.string().nullable().optional()
});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const onboarding = await onboardingFor(locals.user!.id);
		if (!onboarding) redirect(303, '/bienvenue');
		// Pas d'enregistrement d'une étape future ou absente du parcours (ONB-02).
		guardStep('instruments', onboarding);
		let payload;
		try {
			payload = payloadSchema.parse(
				JSON.parse(String((await request.formData()).get('payload') ?? ''))
			);
		} catch {
			return fail(400, { error: 'Données invalides : recharge la page.' });
		}
		const checked = checkInstrumentsInput(payload.instruments, payload.primaryInstrumentId);
		if (!checked.ok) return fail(400, { error: MUSICAL_PROFILE_MESSAGES[checked.problems[0]] });
		try {
			await saveInstruments(onboarding.person, payload);
		} catch (err) {
			if (err instanceof UnknownReferenceError)
				return fail(400, { error: 'Un instrument n’existe plus : recharge la page.' });
			throw err;
		}
		await onProfileChanged(onboarding.person.actorId);
		return redirectAfterStep(onboarding.person.actorId, 'instruments');
	}
};
