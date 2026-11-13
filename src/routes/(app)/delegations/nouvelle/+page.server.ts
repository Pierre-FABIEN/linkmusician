import { fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { delegationOptions, proposeDelegation } from '#server/representation/delegations';
import { RepresentationError } from '#server/representation/service';
import type { Actions, PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, url }) => ({
	...(await delegationOptions((await requirePerson(locals)).actorId)),
	selected: url.searchParams.get('mandat') ?? ''
});
export const actions: Actions = {
	default: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const form = await request.formData();
		let id: string;
		try {
			id = await proposeDelegation(person.actorId, {
				representationId: form.get('representationId'),
				agencyId: form.get('agencyId'),
				delegate: form.get('delegate'),
				expiresOn: form.get('expiresOn') || undefined,
				allowEnd: form.get('allowEnd') === '1'
			});
		} catch (e) {
			if (e instanceof RepresentationError) return fail(e.status, { error: e.message });
			throw e;
		}
		redirect(303, `/delegations/${id}`);
	}
};
