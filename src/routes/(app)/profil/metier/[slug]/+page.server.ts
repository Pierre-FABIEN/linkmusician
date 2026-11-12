/**
 * LINKMUSICIAN: page d'un métier (D59) : spécialités, « Je propose »,
 * « Je recherche » et champs propres, déclarés à l'onboarding, à compléter ou
 * modifier ensuite. Pour chaque métier choisi autre que musicien·ne (dont la
 * page est « Ma pratique »).
 */
import { error, fail } from '@sveltejs/kit';
import { message } from 'sveltekit-superforms';
import { requirePerson } from '#server/actors/tracksForm';
import { stepTrackOf, submitTrackStep, trackStepData } from '#lib/server/actors/trackStep';
import { TRACK_ROLES } from '#lib/actors/roles';
import { trackPageExtras } from '#lib/server/actors/trackSheets';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const person = await requirePerson(locals);
	const track = stepTrackOf(params.slug);
	if (!track) error(404, 'Métier inconnu');
	const held = person.tracks.some((t) => t.track === track);
	if (!held) return { held: false as const, slug: params.slug };
	return {
		held: true as const,
		/** Page historique du métier (ingé son, production…), quand elle existe. */
		profilePath: TRACK_ROLES[track].profilePath,
		...(await trackStepData(person.actorId, track)),
		// Complétude et « Qui voit quoi » (ONB-12b, D61).
		...(await trackPageExtras(person.actorId, track, url))
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const person = await requirePerson(locals);
		const track = stepTrackOf(params.slug);
		if (!track || !person.tracks.some((t) => t.track === track)) return fail(403);
		const result = await submitTrackStep(request, person.actorId, track);
		if ('failure' in result && result.failure) return result.failure;
		return message(result.form!, 'Ton métier est enregistré.');
	}
};
