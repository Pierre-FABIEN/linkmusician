/**
 * LINKMUSICIAN: « Mon profil de producteur·rice » (P4-04, conception 08 §7) :
 * spécialités, styles produits, logiciels, tarifs indicatifs, mobilité,
 * productions en écoute. Réservé aux personnes qui ont le métier (sinon, un
 * lien vers « Mes métiers »).
 */
import { fail } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import { producerProfileSchema } from '#lib/schema/crafts/producerProfileSchema';
import {
	getProducerProfile,
	saveProducerProfile,
	UnknownGenreError
} from '#lib/prisma/crafts/producerProfile';
import { listGenreTree } from '#lib/prisma/skills/referentials';
import { requirePerson } from '#server/actors/tracksForm';
import { MAX_REFERENCES } from '#lib/crafts/common';

import { completenessFor } from '#lib/server/actors/trackSheets';
import { hasOfferIn } from '#lib/prisma/actors/trackSettings';

/** D62 : sans offre cochée, la recherche par métier ne trouve pas la personne. */
const NO_OFFER =
	'Enregistré. Coche ce que tu proposes (page de ton métier) pour apparaître dans la recherche.';
import type { Actions, PageServerLoad } from './$types';

const hasTrack = (person: { tracks: { track: string }[] }) =>
	person.tracks.some((t) => t.track === 'PRODUCER');

/** Une ligne vide en fin de liste, tant qu'il reste de la place. */
const withBlank = (references: { title: string; url: string }[]) =>
	references.length < MAX_REFERENCES ? [...references, { title: '', url: '' }] : references;

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	if (!hasTrack(person))
		return {
			hasTrack: false,
			genres: [],
			form: await superValidate(zod(producerProfileSchema))
		};
	const [current, genres] = await Promise.all([
		getProducerProfile(person.actorId),
		listGenreTree()
	]);
	const form = await superValidate(
		{
			specialties: current?.specialties ?? [],
			genreIds: current?.genres.map((g) => g.id) ?? [],
			software: current?.software ?? '',
			rate: current?.rate ?? '',
			mobility: current?.mobility ?? [],
			references: withBlank(current?.references ?? [])
		},
		zod(producerProfileSchema),
		{ errors: false }
	);
	return {
		hasTrack: true,
		genres,
		form,
		// Complétude (ONB-13a) : sans offre cochée, pas de résultat en recherche (D62).
		...(await completenessFor(person.actorId, ['PRODUCER']))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		const form = await superValidate(request, zod(producerProfileSchema));
		if (!hasTrack(person)) return fail(403, { form });
		if (!form.valid) return fail(400, { form });

		let saved;
		try {
			saved = await saveProducerProfile(person.actorId, form.data);
		} catch (err) {
			if (err instanceof UnknownGenreError)
				return setError(
					form,
					'genreIds._errors',
					'Un style choisi n’existe plus : recharge la page.'
				);
			throw err;
		}
		form.data = { ...saved, references: withBlank(saved.references) };
		return message(
			form,
			(await hasOfferIn(person.actorId, ['PRODUCER']))
				? 'Ton profil de producteur·rice est enregistré : on te trouve dans la recherche.'
				: NO_OFFER
		);
	}
};
