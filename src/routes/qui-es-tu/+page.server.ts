/**
 * LINKMUSICIAN: « Qui es-tu ? », choix des métiers à l'arrivée (P1-03b, D15).
 *
 * Passage obligé avant l'espace `(app)` pour toute personne sans métier : la
 * garde de `(app)/+layout.server.ts` redirige ici. Une fois les métiers
 * enregistrés, on propose l'étape « structure ».
 */
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import { tracksSchema } from '#lib/schema/actors/tracksSchema';
import { setPersonTracks } from '#lib/prisma/actors/tracks';
import { requirePerson, tracksFormFor } from '#server/actors/tracksForm';
import type { Actions, PageServerLoad } from './$types';

const APP_HOME = '/espace';
const NEXT_STEP = '/structure';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	if (person.tracks.length > 0) redirect(302, APP_HOME);
	return { form: await tracksFormFor([]) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		if (person.tracks.length > 0) redirect(303, APP_HOME);

		const form = await superValidate(request, zod(tracksSchema));
		if (!form.valid) return fail(400, { form });

		await setPersonTracks(person.actorId, {
			tracks: form.data.tracks,
			primary: form.data.primary ?? form.data.tracks[0]
		});
		redirect(303, NEXT_STEP);
	}
};
