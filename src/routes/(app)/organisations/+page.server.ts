// LINKMUSICIAN: « Mes organisations » (P5-05b) : les associations, collectifs
// et festivals que je gère, la création d'une fiche et les invitations à la
// co-gestion. Réservé aux organisateur·rices majeur·es (D5). Les lieux que je
// gère, et les invitations à en gérer un (P5-03b), sont listés ici aussi.
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
import { answerVenueInvite, myVenueInvites, myVenues } from '#lib/server/venues/profile';
import { prisma } from '#lib/server';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	const [canOpen, orgs, orgInvites, venues, venueInvites] = await Promise.all([
		isPromoter(person.actorId),
		myPromoterOrgs(person.actorId),
		myPromoterOrgInvites(person.actorId),
		myVenues(person.actorId),
		myVenueInvites(person.actorId)
	]);
	return {
		canOpen,
		orgs,
		venues: venues.map(({ venueId, name, commune, role, published }) => ({
			venueId,
			name,
			commune,
			role,
			published
		})),
		invites: [...orgInvites, ...venueInvites]
	};
};

export const actions: Actions = {
	answer: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const data = await request.formData();
		const accept = data.get('accept') === '1';
		const membershipId = String(data.get('membershipId') ?? '');
		// Une organisation ou un lieu : la co-gestion commune tranche selon le type.
		const row = await prisma.membership.findUnique({
			where: { id: membershipId },
			select: { org: { select: { kind: true } } }
		});
		try {
			if (row?.org.kind === 'VENUE') await answerVenueInvite(membershipId, person.actorId, accept);
			else await answerPromoterInvite(membershipId, person.actorId, accept);
		} catch (err) {
			if (err instanceof PromoterOrgError) return fail(err.status, { inviteError: err.message });
			throw err;
		}
		return {
			answered: accept ? 'C’est fait : tu fais partie de la gestion.' : 'Invitation déclinée.'
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
