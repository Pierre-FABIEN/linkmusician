// LINKMUSICIAN: messagerie (P2-04) : demandes reçues et conversations.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { listConversations } from '#lib/server/messaging/service';
import { listDiscussions } from '#lib/server/discussions/service';
import { currentTip } from '#lib/server/guide/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:messages');
	const person = (await getPersonByUserId(locals.user!.id))!;
	const [conversations, discussions] = await Promise.all([
		listConversations(person.actorId),
		// Discussions de groupe (P3-16c) : invitations en attente, puis les autres.
		listDiscussions(person.actorId)
	]);
	return {
		// Conseil en contexte (P2-17).
		tip: await currentTip('messages', person),
		requests: conversations.filter((c) => c.myState === 'REQUEST'),
		conversations: conversations.filter((c) => c.myState !== 'REQUEST'),
		invitations: discussions.filter((d) => d.invitation),
		discussions: discussions.filter((d) => !d.invitation)
	};
};
