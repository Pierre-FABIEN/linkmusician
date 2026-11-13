import { error, fail } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import {
	AgencyError,
	agencyForMe,
	agencyTeam,
	inviteAgencyMember,
	removeAgencyMember
} from '#server/agencies/service';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = async ({ locals, params }) => {
	const person = await requirePerson(locals);
	const agency = await agencyForMe(params.id, person.actorId);
	if (!agency || agency.status !== 'ACTIVE' || agency.role === 'MEMBER')
		error(404, 'Équipe introuvable.');
	try {
		return { agency, team: await agencyTeam(params.id, person.actorId) };
	} catch (e) {
		if (e instanceof AgencyError) error(e.status, e.message);
		throw e;
	}
};
export const actions: Actions = {
	invite: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		try {
			await inviteAgencyMember(
				params.id,
				person.actorId,
				Object.fromEntries(await request.formData())
			);
			return { done: 'Invitation envoyée.' };
		} catch (e) {
			if (e instanceof AgencyError) return fail(e.status, { error: e.message });
			throw e;
		}
	},
	remove: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		try {
			await removeAgencyMember(
				params.id,
				person.actorId,
				String((await request.formData()).get('membershipId') ?? '')
			);
			return { done: 'Participation retirée.' };
		} catch (e) {
			if (e instanceof AgencyError) return fail(e.status, { error: e.message });
			throw e;
		}
	}
};
