/**
 * LINKMUSICIAN: « Mon profil » (P1-06b, D17, D18) : bio, statut pro, ce que je
 * recherche, matériel, pratique, mobilité, liens. Le profil musical a sa
 * page : `/profil/musical`.
 */
import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import { profileSchema } from '#lib/schema/actors/profileSchema';
import {
	getProfileDetails,
	profileFormValues,
	saveProfileDetails
} from '#lib/prisma/actors/profile';
import { requirePerson } from '#server/actors/tracksForm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	const details = await getProfileDetails(person);
	return {
		form: await superValidate(profileFormValues(details), zod(profileSchema), { errors: false })
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		const form = await superValidate(request, zod(profileSchema));
		if (!form.valid) return fail(400, { form });

		await saveProfileDetails(person, form.data);
		form.data = profileFormValues(await getProfileDetails(person));
		return message(form, 'Ton profil est enregistré.');
	}
};
