/**
 * LINKMUSICIAN: « Ma pratique de musicien·ne » (ONB-03, D58) : ce qui a été
 * déclaré au dernier écran de l'onboarding, à compléter ou modifier. Réservé
 * au métier musicien·ne.
 */
import { fail } from '@sveltejs/kit';
import { message } from 'sveltekit-superforms';
import { requirePerson } from '#server/actors/tracksForm';
import { musicianStepData, submitMusicianStep } from '#lib/server/musician/step';
import { trackPageExtras } from '#lib/server/actors/trackSheets';
import type { Actions, PageServerLoad } from './$types';

const isMusician = (person: { tracks: { track: string }[] }) =>
	person.tracks.some((t) => t.track === 'MUSICIAN');

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = await requirePerson(locals);
	if (!isMusician(person)) return { hasTrack: false as const };
	return {
		hasTrack: true as const,
		...(await musicianStepData(person.actorId)),
		// Complétude et « Qui voit quoi » (ONB-12b, D61).
		...(await trackPageExtras(person.actorId, 'MUSICIAN', url))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		if (!isMusician(person)) return fail(403);
		const result = await submitMusicianStep(request, person.actorId);
		if ('failure' in result) return result.failure;
		return message(result.form, 'Ta pratique est enregistrée.');
	}
};
