/**
 * LINKMUSICIAN: « Mon profil de manager ou de booker » (P5-07, conception 06
 * §3.4 et §3.5) : genres suivis et ce que je cherche. La zone est « Ma
 * ville » ; les artistes accompagnés sont ceux qui ont confirmé
 * (`/accompagnement`). Réservé aux personnes qui ont l'un des deux métiers.
 */
import { fail } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import { agentProfileSchema } from '#lib/schema/crafts/agentProfileSchema';
import {
	getAgentProfile,
	saveAgentProfile,
	UnknownGenreError
} from '#lib/prisma/crafts/agentProfile';
import { listGenreTree } from '#lib/prisma/skills/referentials';
import { requirePerson } from '#server/actors/tracksForm';

import { completenessFor } from '#lib/server/actors/trackSheets';
import { hasOfferIn } from '#lib/prisma/actors/trackSettings';

/** D62 : sans offre cochée, la recherche par métier ne trouve pas la personne. */
const NO_OFFER =
	'Enregistré. Coche ce que tu proposes (page de ton métier) pour apparaître dans la recherche.';
import type { Actions, PageServerLoad } from './$types';

const hasTrack = (person: { tracks: { track: string }[] }) =>
	person.tracks.some((t) => t.track === 'MANAGER' || t.track === 'BOOKER');

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	if (!hasTrack(person))
		return { hasTrack: false, genres: [], form: await superValidate(zod(agentProfileSchema)) };
	const [current, genres] = await Promise.all([getAgentProfile(person.actorId), listGenreTree()]);
	const form = await superValidate(
		{ genreIds: current?.genres.map((g) => g.id) ?? [], pitch: current?.pitch ?? '' },
		zod(agentProfileSchema),
		{ errors: false }
	);
	return {
		hasTrack: true,
		genres,
		form,
		// Complétude (ONB-13a) : sans offre cochée, pas de résultat en recherche (D62).
		...(await completenessFor(person.actorId, ['MANAGER', 'BOOKER']))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		const form = await superValidate(request, zod(agentProfileSchema));
		if (!hasTrack(person)) return fail(403, { form });
		if (!form.valid) return fail(400, { form });
		let saved;
		try {
			saved = await saveAgentProfile(person.actorId, form.data);
		} catch (err) {
			if (err instanceof UnknownGenreError)
				return setError(
					form,
					'genreIds._errors',
					'Un genre choisi n’existe plus : recharge la page.'
				);
			throw err;
		}
		form.data = { genreIds: saved.genreIds, pitch: saved.pitch ?? '' };
		return message(
			form,
			(await hasOfferIn(person.actorId, ['MANAGER', 'BOOKER']))
				? 'Ta fiche est enregistrée : les artistes te trouvent dans la recherche.'
				: NO_OFFER
		);
	}
};
