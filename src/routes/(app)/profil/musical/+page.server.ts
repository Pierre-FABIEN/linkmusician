/**
 * LINKMUSICIAN: « Mon profil musical » (P1-06) : instruments et niveau déclaré
 * (D11), genres (D12), influences.
 */
import { fail } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import { musicalProfileSchema } from '#lib/schema/skills/musicalProfileSchema';
import { checkMusicalProfile } from '#lib/skills/profile';
import { listGenreTree, listInstrumentsByFamily } from '#lib/prisma/skills/referentials';
import {
	getMusicalProfile,
	saveMusicalProfile,
	UnknownReferenceError
} from '#lib/prisma/skills/musicalProfile';
import { requirePerson } from '#server/actors/tracksForm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	const [current, families, genres] = await Promise.all([
		getMusicalProfile(person),
		listInstrumentsByFamily(),
		listGenreTree()
	]);
	const form = await superValidate(
		{
			instruments: current.instruments.map((i) => ({
				instrumentId: i.instrumentId,
				level: i.level
			})),
			primaryInstrumentId: current.instruments.find((i) => i.isPrimary)?.instrumentId,
			genreIds: current.genres.map((g) => g.genreId),
			influences: current.influences.join('\n')
		},
		zod(musicalProfileSchema),
		{ errors: false }
	);
	return { form, families, genres };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		const form = await superValidate(request, zod(musicalProfileSchema));
		if (!form.valid) return fail(400, { form });

		const checked = checkMusicalProfile(form.data);
		if (!checked.ok) return fail(400, { form }); // déjà couvert par le schéma

		try {
			await saveMusicalProfile(person, checked.profile);
		} catch (err) {
			if (err instanceof UnknownReferenceError) {
				const path = err.field === 'instruments' ? 'instruments._errors' : 'genreIds._errors';
				return setError(form, path, 'Un élément choisi n’existe plus : recharge la page.');
			}
			throw err;
		}
		form.data.primaryInstrumentId = checked.profile.primaryInstrumentId;
		form.data.influences = checked.profile.influences.join('\n');
		return message(form, 'Ton profil musical est enregistré.');
	}
};
