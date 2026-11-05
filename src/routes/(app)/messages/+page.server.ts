// LINKMUSICIAN: messagerie (P2-04) : demandes reçues et conversations.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { listConversations } from '#lib/server/messaging/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:messages');
	const person = (await getPersonByUserId(locals.user!.id))!;
	const conversations = await listConversations(person.actorId);
	return {
		requests: conversations.filter((c) => c.myState === 'REQUEST'),
		conversations: conversations.filter((c) => c.myState !== 'REQUEST')
	};
};
