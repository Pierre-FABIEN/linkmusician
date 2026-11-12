/**
 * LINKMUSICIAN: onboarding, étape d'un métier (ONB-02, D57) : spécialités,
 * puis « Je propose » et « Je recherche » quand le métier a ses catalogues
 * (ONB-03 à 11). Une étape par métier choisi autre que musicien·ne
 * (`TRACK_ROLES[…].onboarding.ownStep`).
 *
 * Le métier vient de l'adresse, jamais du formulaire. Valider l'étape la
 * marque faite (`PersonTrack.detailsConfirmedAt`), même sans rien cocher pour
 * un métier « bientôt » (D15).
 */
import { fail, redirect } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { TRACKS, type TrackKindValue } from '#lib/actors/tracks';
import { TRACK_ROLES } from '#lib/actors/roles';
import { CODES_MESSAGES, INTENTS, selectableSpecializations } from '#lib/actors/specializations';
import {
	minSpecializations,
	stepPath,
	trackOfSlug,
	trackStepId,
	TRACK_STEP_MESSAGES
} from '#lib/onboarding/steps';
import { trackDetailsSchema } from '#lib/schema/actors/trackDetailsSchema';
import {
	getTrackDetails,
	InvalidTrackCodeError,
	setTrackDetails,
	TrackNotHeldError
} from '#lib/prisma/actors/specializations';
import { onProfileChanged } from '#lib/server/progression/profile';
import { onboardingFor, redirectAfterStep } from '#lib/server/onboarding';
import { guardStep } from '#lib/server/onboarding-guard';
import type { Actions, PageServerLoad } from './$types';

/** Métier de l'adresse, s'il a sa propre étape ; sinon `null`. */
function trackOf(slug: string): TrackKindValue | null {
	const track = trackOfSlug(slug);
	return track && TRACK_ROLES[track].onboarding.ownStep ? track : null;
}

export const load: PageServerLoad = async ({ parent, params }) => {
	const data = await parent();
	const track = trackOf(params.slug);
	if (!track) redirect(302, data.step ? stepPath(data.step) : '/jouer');
	guardStep(trackStepId(track), data);

	const current = (await getTrackDetails(data.actorId)).find((d) => d.track === track);
	const form = await superValidate(
		current ?? { track, specializations: [], offers: [], needs: [] },
		zod(trackDetailsSchema),
		{ errors: false }
	);
	return {
		stepId: trackStepId(track),
		track,
		label: TRACKS[track].label,
		description: TRACKS[track].description,
		/** Métier « bientôt » (D15) : étape facultative. */
		soon: !TRACKS[track].available,
		minSpecializations: minSpecializations(track),
		specializations: selectableSpecializations(track).map(({ code, label, description }) => ({
			code,
			label,
			description
		})),
		offers: INTENTS[track].OFFER,
		needs: INTENTS[track].NEED,
		form
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const onboarding = await onboardingFor(locals.user!.id);
		if (!onboarding) redirect(303, '/bienvenue');
		const track = trackOf(params.slug);
		if (!track) redirect(303, onboarding.step ? stepPath(onboarding.step) : '/jouer');
		guardStep(trackStepId(track), onboarding);

		const form = await superValidate(request, zod(trackDetailsSchema));
		form.data.track = track;
		if (!form.valid) return fail(400, { form });
		if (form.data.specializations.length < minSpecializations(track))
			return setError(form, 'specializations._errors', TRACK_STEP_MESSAGES.specializations);

		const actorId = onboarding.person.actorId;
		try {
			await setTrackDetails(actorId, { ...form.data, track }, { confirm: true });
		} catch (err) {
			if (err instanceof InvalidTrackCodeError)
				return setError(form, `${err.list}._errors`, CODES_MESSAGES[err.reason]);
			if (err instanceof TrackNotHeldError) redirect(303, '/qui-es-tu');
			throw err;
		}
		await onProfileChanged(actorId);
		return redirectAfterStep(actorId, trackStepId(track));
	}
};
