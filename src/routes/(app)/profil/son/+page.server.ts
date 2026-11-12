/**
 * LINKMUSICIAN: « Mon profil d'ingé son » (P4-02, conception 08 §5) :
 * spécialités, mobilité, matériel, travaux en écoute. Réservé aux personnes
 * qui ont le métier ingé son (sinon, un lien vers « Mes métiers »).
 */
import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import { soundProfileSchema } from '#lib/schema/crafts/soundProfileSchema';
import { getSoundProfile, saveSoundProfile } from '#lib/prisma/crafts/soundProfile';
import { requirePerson } from '#server/actors/tracksForm';
import { MAX_REFERENCES } from '#lib/crafts/sound';

import { completenessFor } from '#lib/server/actors/trackSheets';
import { hasOfferIn } from '#lib/prisma/actors/trackSettings';

/** D62 : sans offre cochée, la recherche par métier ne trouve pas la personne. */
const NO_OFFER =
	'Enregistré. Coche ce que tu proposes (page de ton métier) pour apparaître dans la recherche.';
import type { Actions, PageServerLoad } from './$types';

const hasTrack = (person: { tracks: { track: string }[] }) =>
	person.tracks.some((t) => t.track === 'SOUND_ENGINEER');

/** Une ligne vide en fin de liste, tant qu'il reste de la place. */
const withBlanks = (references: { title: string; url: string }[]) =>
	references.length < MAX_REFERENCES ? [...references, { title: '', url: '' }] : references;

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	if (!hasTrack(person))
		return { hasTrack: false, form: await superValidate(zod(soundProfileSchema)) };
	const current = await getSoundProfile(person.actorId);
	const form = await superValidate(
		{
			specialties: current?.specialties ?? [],
			mobility: current?.mobility ?? [],
			gear: current?.gear ?? '',
			references: withBlanks(current?.references ?? [])
		},
		zod(soundProfileSchema),
		{ errors: false }
	);
	return {
		hasTrack: true,
		form,
		// Complétude (ONB-13a) : sans offre cochée, pas de résultat en recherche (D62).
		...(await completenessFor(person.actorId, ['SOUND_ENGINEER']))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		const form = await superValidate(request, zod(soundProfileSchema));
		if (!hasTrack(person)) return fail(403, { form });
		if (!form.valid) return fail(400, { form });

		const saved = await saveSoundProfile(person.actorId, form.data);
		form.data = {
			specialties: saved.specialties,
			mobility: saved.mobility,
			gear: saved.gear,
			references: withBlanks(saved.references)
		};
		return message(
			form,
			(await hasOfferIn(person.actorId, ['SOUND_ENGINEER']))
				? 'Ton profil d’ingé son est enregistré : on te trouve dans la recherche.'
				: NO_OFFER
		);
	}
};
