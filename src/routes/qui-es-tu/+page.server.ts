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
import { assistantState } from '#lib/server/onboarding-assistant';
import type { Actions, PageServerLoad } from './$types';

// LINKMUSICIAN: le menu du jeu est le point d'entrée de l'espace (P2-12b).
const APP_HOME = '/jouer';
/** Étape suivante : la suite de l'onboarding (P1-10). */
const NEXT_STEP = '/demarrer';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	// Onboarding terminé : les métiers se modifient dans les réglages.
	if (person.onboardedAt) redirect(302, APP_HOME);
	return {
		form: await tracksFormFor(person.tracks),
		// Assistant d'inscription facultatif (P3-17, D47).
		assistant: await assistantState(person.actorId)
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		if (person.onboardedAt) redirect(303, APP_HOME);

		const form = await superValidate(request, zod(tracksSchema));
		if (!form.valid) return fail(400, { form });

		await setPersonTracks(person.actorId, {
			tracks: form.data.tracks,
			primary: form.data.primary ?? form.data.tracks[0]
		});
		redirect(303, NEXT_STEP);
	}
};
