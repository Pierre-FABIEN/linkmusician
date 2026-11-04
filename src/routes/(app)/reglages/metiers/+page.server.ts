/**
 * LINKMUSICIAN: modification des métiers dans les réglages (P1-03b).
 */
import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import { tracksSchema } from '#lib/schema/actors/tracksSchema';
import { setPersonTracks } from '#lib/prisma/actors/tracks';
import { requirePerson, tracksFormFor } from '#server/actors/tracksForm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	return { form: await tracksFormFor(person.tracks) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		const form = await superValidate(request, zod(tracksSchema));
		if (!form.valid) return fail(400, { form });

		const saved = await setPersonTracks(person.actorId, {
			tracks: form.data.tracks,
			primary: form.data.primary ?? form.data.tracks[0]
		});
		form.data = { tracks: saved.tracks, primary: saved.primary };
		return message(form, 'Tes métiers sont enregistrés.');
	}
};
