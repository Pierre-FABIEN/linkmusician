/**
 * LINKMUSICIAN: « Ma ville » (P1-05). Le navigateur n'envoie qu'un code INSEE :
 * la commune est relue côté serveur, et seul son centre, aligné sur une grille
 * de ~2 km, est enregistré.
 */
import { fail } from '@sveltejs/kit';
import { getCommune } from '#lib/server/geo/communes';
import { clearActorLocation, getActorLocation, setActorLocation } from '#lib/server/geo/queries';
import { requirePerson } from '#server/actors/tracksForm';
import { onProfileChanged } from '#lib/server/progression/profile';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	return { location: await getActorLocation(person.actorId) };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		const code = String((await request.formData()).get('communeCode') ?? '');
		let commune;
		try {
			commune = await getCommune(code);
		} catch {
			return fail(502, {
				error: 'Le service des communes ne répond pas. Réessaie dans un instant.'
			});
		}
		if (!commune) return fail(400, { error: 'Choisis une commune dans la liste.' });
		await setActorLocation(person.actorId, commune);
		await onProfileChanged(person.actorId);
		// Les gains sont fêtés par les célébrations de l'espace (P2-11), plus dans ce message.
		return { saved: `Ta ville est enregistrée : ${commune.nom}.` };
	},
	clear: async ({ locals }) => {
		const person = await requirePerson(locals);
		await clearActorLocation(person.actorId);
		await onProfileChanged(person.actorId);
		return { cleared: true };
	}
};
