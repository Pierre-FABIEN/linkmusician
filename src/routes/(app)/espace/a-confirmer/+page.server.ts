// LINKMUSICIAN: « À traiter » (U0, conception 20 §6.3 ; P2-06, P3-01, P3-11,
// P5-07) : tout ce qui attend ma réponse, droits et blocages déjà appliqués
// (`inboxFor`). L'adresse `/espace/a-confirmer` est conservée. U3 : invitations
// de projet (le minimum de §9.3) et coordinations proposées, avec leur réponse.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { inboxFor } from '#lib/server/space/inbox';
import { answerInvitationForm } from '#lib/server/projects/answer-form';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	const person = (await getPersonByUserId(locals.user!.id))!;
	const inbox = await inboxFor(person, new Date(), locals);
	return {
		collaborations: inbox.collaborations.map((c) => ({
			id: c.id,
			title: c.title,
			with: c.with,
			step: c.step,
			href: `/messages/${c.conversationId}`
		})),
		credits: inbox.credits.map((c) => ({ workId: c.workId, title: c.title })),
		bandInvitations: inbox.bandInvitations.map((b) => ({ bandId: b.bandId, name: b.name })),
		projectInvitations: inbox.projectInvitations,
		capabilityOffers: inbox.capabilityOffers,
		representations: inbox.representations.length,
		applications: inbox.applications,
		contactRequests: inbox.contactRequests
	};
};

export const actions: Actions = {
	// U3 : la réponse à une invitation de projet, comme dans « Mes projets ».
	repondre: answerInvitationForm
};
