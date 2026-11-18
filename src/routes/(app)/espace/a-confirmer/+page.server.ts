// LINKMUSICIAN: « À traiter » (U0, conception 20 §6.3 ; P2-06, P3-01, P3-11,
// P5-07) : tout ce qui attend ma réponse, droits et blocages déjà appliqués
// (`inboxFor`). L'adresse `/espace/a-confirmer` est conservée.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { inboxFor } from '#lib/server/space/inbox';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
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
		representations: inbox.representations.length,
		applications: inbox.applications,
		contactRequests: inbox.contactRequests
	};
};
