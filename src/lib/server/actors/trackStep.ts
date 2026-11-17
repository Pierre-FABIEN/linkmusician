/**
 * Écran d'un métier (ONB-02, D59) côté serveur, partagé par l'étape de
 * l'onboarding (`/demarrer/metier/[slug]`) et la page du métier
 * (`/profil/metier/[slug]`) : données du formulaire, puis enregistrement
 * revérifié (codes, spécialité minimale, champs propres).
 */
import { fail } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { TRACKS, type TrackKindValue } from '#lib/actors/tracks';
import { TRACK_ROLES, minSpecializations, trackOfSlug } from '#lib/actors/roles';
import { CODES_MESSAGES, INTENTS, selectableSpecializations } from '#lib/actors/specializations';
import { fieldsAt, trackFields, type FieldStage } from '#lib/actors/trackFields';
import { TRACK_STEP_MESSAGES } from '#lib/onboarding/steps';
import { trackDetailsSchema } from '#lib/schema/actors/trackDetailsSchema';
import {
	getTrackAnswers,
	getTrackDetails,
	InvalidFieldError,
	InvalidTrackCodeError,
	setTrackDetails,
	TrackNotHeldError
} from '#lib/prisma/actors/specializations';
import { onProfileChanged } from '#lib/server/progression/profile';

/** Métier de l'adresse, s'il a son propre écran ; sinon `null`. */
export function stepTrackOf(slug: string): TrackKindValue | null {
	const track = trackOfSlug(slug);
	return track && TRACK_ROLES[track].onboarding.ownStep ? track : null;
}

export async function trackStepData(
	personId: string,
	track: TrackKindValue,
	stage: FieldStage = 'profile'
) {
	const [all, details] = await Promise.all([
		getTrackDetails(personId),
		getTrackAnswers(personId, track)
	]);
	const current = all.find((d) => d.track === track) ?? {
		track,
		specializations: [],
		offers: [],
		needs: []
	};
	const form = await superValidate({ ...current, details }, zod(trackDetailsSchema), {
		errors: false
	});
	return {
		track,
		label: TRACKS[track].label,
		description: TRACKS[track].description,
		/** Métier « bientôt » (D15) : rien d'exigé. */
		soon: !TRACKS[track].available,
		minSpecializations: minSpecializations(track),
		specializations: selectableSpecializations(track).map(({ code, label, description }) => ({
			code,
			label,
			description
		})),
		offers: INTENTS[track].OFFER,
		needs: INTENTS[track].NEED,
		fields: fieldsAt(track, stage),
		stage,
		form
	};
}

/**
 * Valide et enregistre. Renvoie `{ failure }` (à renvoyer tel quel), ou
 * `{ form }` une fois enregistré. Le métier vient de l'adresse, jamais du
 * formulaire.
 */
export async function submitTrackStep(
	request: Request,
	personId: string,
	track: TrackKindValue,
	options: { confirm?: boolean; stage?: FieldStage } = {}
) {
	const form = await superValidate(request, zod(trackDetailsSchema));
	form.data.track = track;
	if (!form.valid) return { failure: fail(400, { form }) };
	if (form.data.specializations.length < minSpecializations(track))
		return {
			failure: setError(form, 'specializations._errors', TRACK_STEP_MESSAGES.specializations)
		};
	try {
		const { details, ...choices } = form.data;
		await setTrackDetails(personId, { ...choices, track }, { ...options, answers: details });
	} catch (err) {
		if (err instanceof InvalidTrackCodeError)
			return { failure: setError(form, `${err.list}._errors`, CODES_MESSAGES[err.reason]) };
		if (err instanceof InvalidFieldError)
			return { failure: setError(form, '', `${fieldLabel(track, err.field)} : ${err.message}`) };
		if (err instanceof TrackNotHeldError) return { failure: fail(403, { form }) };
		throw err;
	}
	await onProfileChanged(personId);
	return { form };
}

function fieldLabel(track: TrackKindValue, id: string): string {
	return trackFields(track).find((f) => f.id === id)?.label ?? id;
}
