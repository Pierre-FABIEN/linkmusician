/**
 * LINKMUSICIAN: une conversation (P2-04) : fil, réponse à une demande,
 * envoi, signalement de la personne. Rafraîchie par polling côté page (D8).
 */
import { error, fail } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import {
	MessagingError,
	openConversation,
	respondToRequest,
	sendMessage
} from '#lib/server/messaging/service';
import { fileReport, ModerationError } from '#lib/server/moderation/service';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals, params, depends }) => {
	depends('app:conversation');
	try {
		return { conversation: await openConversation((await me(locals)).actorId, params.id) };
	} catch (err) {
		if (err instanceof MessagingError) error(err.status, err.message);
		throw err;
	}
};

const handle = async (run: () => Promise<unknown>) => {
	try {
		await run();
		return { ok: true };
	} catch (err) {
		if (err instanceof MessagingError || err instanceof ModerationError) {
			return fail(err instanceof MessagingError ? err.status : 400, { error: err.message });
		}
		throw err;
	}
};

export const actions: Actions = {
	send: async ({ locals, params, request }) => {
		const body = String((await request.formData()).get('body') ?? '');
		return handle(async () => sendMessage((await me(locals)).actorId, params.id, body));
	},
	accept: async ({ locals, params }) =>
		handle(async () => respondToRequest((await me(locals)).actorId, params.id, true)),
	decline: async ({ locals, params }) =>
		handle(async () => respondToRequest((await me(locals)).actorId, params.id, false)),
	/** Signaler la personne (P1-12), depuis la conversation. */
	report: async ({ locals, params, request }) => {
		const data = await request.formData();
		const actorId = (await me(locals)).actorId;
		const other = await prisma.conversationParticipant.findFirst({
			where: { conversationId: params.id, actorId: { not: actorId } },
			select: { actorId: true }
		});
		if (!other) error(404, 'Conversation introuvable');
		return handle(() =>
			fileReport(actorId, {
				targetType: 'ACTOR',
				targetId: other.actorId,
				reason: String(data.get('reason') ?? ''),
				details: String(data.get('details') ?? '')
			})
		);
	}
};
