// LINKMUSICIAN: « Mes organisations » (P5-05b) : les associations, collectifs
// et festivals que je gère, la création d'une fiche et les invitations à la
// co-gestion. Réservé aux organisateur·rices majeur·es (D5).
import { fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { isPromoter } from '#lib/server/opportunities/gigSlots';
import {
	answerPromoterInvite,
	createPromoterOrg,
	myPromoterOrgInvites,
	myPromoterOrgs,
	PromoterOrgError
} from '#lib/server/organizations/promoters';
import { promoterOrgSchema } from '#lib/organizations/promoter';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	const [canOpen, orgs, invites] = await Promise.all([
		isPromoter(person.actorId),
		myPromoterOrgs(person.actorId),
		myPromoterOrgInvites(person.actorId)
	]);
	return { canOpen, orgs, invites };
};

export const actions: Actions = {
	answer: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const data = await request.formData();
		const accept = data.get('accept') === '1';
		try {
			await answerPromoterInvite(String(data.get('membershipId') ?? ''), person.actorId, accept);
		} catch (err) {
			if (err instanceof PromoterOrgError) return fail(err.status, { inviteError: err.message });
			throw err;
		}
		return {
			answered: accept ? 'Tu gères maintenant cette organisation.' : 'Invitation déclinée.'
		};
	},
	create: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const name = String((await request.formData()).get('name') ?? '');
		const parsed = promoterOrgSchema.safeParse({ name });
		if (!parsed.success) {
			return fail(400, { name, error: parsed.error.issues[0]?.message ?? 'Vérifie le nom.' });
		}
		let handle: string;
		try {
			({ handle } = await createPromoterOrg(person.actorId, parsed.data));
		} catch (err) {
			if (err instanceof PromoterOrgError) return fail(err.status, { name, error: err.message });
			throw err;
		}
		redirect(303, `/organisations/${handle}?cree=1`);
	}
};
