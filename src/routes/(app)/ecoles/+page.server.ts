// LINKMUSICIAN: « Mes écoles » (P5-11, D29) : les écoles, MJC et
// conservatoires dont je fais partie, comme prof ou comme élève, et
// l'ouverture d'une école (personne majeure). Règles :
// `#server/schools/service`.
import { fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { createSchool, mySchools, SchoolError } from '#lib/server/schools/service';
import { schoolSchema } from '#lib/schools/rules';
import { isIndexable } from '#lib/actors/visibility';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	return { schools: await mySchools(person.actorId), canOpen: isIndexable(person.birthDate) };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const data = Object.fromEntries(await request.formData());
		const parsed = schoolSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, {
				name: String(data.name ?? ''),
				error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.'
			});
		}
		let handle: string;
		try {
			({ handle } = await createSchool(person.actorId, parsed.data));
		} catch (err) {
			if (err instanceof SchoolError) {
				return fail(err.status, { name: parsed.data.name, error: err.message });
			}
			throw err;
		}
		redirect(303, `/ecoles/${handle}?creee=1`);
	}
};
