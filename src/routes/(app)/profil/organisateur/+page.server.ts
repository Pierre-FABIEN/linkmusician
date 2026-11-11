/**
 * LINKMUSICIAN: « Mon profil d'organisateur·rice » (P5-05a, conception 08 §8) :
 * ce que j'organise, genres programmés, jauge habituelle, événements passés
 * en lien. Réservé aux personnes qui ont le métier (sinon, un lien vers
 * « Mes métiers »). Les événements tenus viendront avec P5-06.
 */
import { fail } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import { promoterProfileSchema } from '#lib/schema/crafts/promoterProfileSchema';
import {
	getPromoterProfile,
	savePromoterProfile,
	UnknownGenreError
} from '#lib/prisma/crafts/promoterProfile';
import { listGenreTree } from '#lib/prisma/skills/referentials';
import { requirePerson } from '#server/actors/tracksForm';
import { MAX_REFERENCES } from '#lib/crafts/common';

import type { Actions, PageServerLoad } from './$types';

const hasTrack = (person: { tracks: { track: string }[] }) =>
	person.tracks.some((t) => t.track === 'PROMOTER');

/** Une ligne vide en fin de liste, tant qu'il reste de la place. */
const withBlank = (references: { title: string; url: string }[]) =>
	references.length < MAX_REFERENCES ? [...references, { title: '', url: '' }] : references;

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	if (!hasTrack(person))
		return { hasTrack: false, genres: [], form: await superValidate(zod(promoterProfileSchema)) };
	const [current, genres] = await Promise.all([
		getPromoterProfile(person.actorId),
		listGenreTree()
	]);
	const form = await superValidate(
		{
			eventKinds: current?.eventKinds ?? [],
			genreIds: current?.genres.map((g) => g.id) ?? [],
			capacity: current?.capacity ?? null,
			references: withBlank(current?.references ?? [])
		},
		zod(promoterProfileSchema),
		{ errors: false }
	);
	return { hasTrack: true, genres, form };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		const form = await superValidate(request, zod(promoterProfileSchema));
		if (!hasTrack(person)) return fail(403, { form });
		if (!form.valid) return fail(400, { form });

		let saved;
		try {
			saved = await savePromoterProfile(person.actorId, form.data);
		} catch (err) {
			if (err instanceof UnknownGenreError)
				return setError(
					form,
					'genreIds._errors',
					'Un genre choisi n’existe plus : recharge la page.'
				);
			throw err;
		}
		form.data = { ...saved, references: withBlank(saved.references) };
		return message(
			form,
			saved.eventKinds.length > 0
				? 'Ta fiche d’organisateur·rice est enregistrée : on te trouve dans la recherche.'
				: 'Enregistré. Coche au moins un type d’événement pour apparaître dans la recherche.'
		);
	}
};
