import { error, fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import {
	AgencyError,
	agencyForMe,
	answerAgencyInvite,
	removeAgencyMember,
	closeAgency
} from '#server/agencies/service';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = async ({ locals, params }) => {
	const person = await requirePerson(locals);
	const agency = await agencyForMe(params.id, person.actorId);
	if (!agency) error(404, 'Participation introuvable.');
	return { agency };
};
export const actions: Actions = {
	answer: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		try {
			await answerAgencyInvite(
				params.id,
				person.actorId,
				(await request.formData()).get('accept') === '1'
			);
		} catch (e) {
			if (e instanceof AgencyError) return fail(e.status, { error: e.message });
			throw e;
		}
		redirect(303, '/agences');
	},
	leave: async ({ locals, params }) => {
		const person = await requirePerson(locals);
		const agency = await agencyForMe(params.id, person.actorId);
		if (!agency) error(404, 'Participation introuvable.');
		try {
			await removeAgencyMember(params.id, person.actorId, agency.membershipId);
		} catch (e) {
			if (e instanceof AgencyError) return fail(e.status, { error: e.message });
			throw e;
		}
		redirect(303, '/agences');
	},
	close: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		if ((await request.formData()).get('confirm') !== '1')
			return fail(400, { error: 'Confirme la fermeture de l’agence.' });
		try {
			await closeAgency(params.id, person.actorId);
		} catch (e) {
			if (e instanceof AgencyError) return fail(e.status, { error: e.message });
			throw e;
		}
		redirect(303, '/agences');
	}
};
