import { error, fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { AgencyError, createAgency, canCreateAgency } from '#server/agencies/service';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	if (!(await canCreateAgency(person.actorId)))
		error(403, 'Créer une agence demande le métier Manager ou Booker et la majorité.');
};
export const actions: Actions = {
	default: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		let id: string;
		try {
			id = (await createAgency(person.actorId, Object.fromEntries(await request.formData()))).id;
		} catch (e) {
			if (e instanceof AgencyError) return fail(e.status, { error: e.message });
			throw e;
		}
		redirect(303, `/agences/${id}`);
	}
};
