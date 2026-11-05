/**
 * LINKMUSICIAN: premier message à quelqu'un (P2-04), depuis son profil
 * (`?a=<handle>`). Une conversation existante est simplement rouverte.
 */
import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { publicActorWhere } from '#lib/server/actors/visibility';
import {
	MessagingError,
	findConversationWith,
	startConversation
} from '#lib/server/messaging/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const handle = url.searchParams.get('a')?.toLowerCase() ?? '';
	const person = (await getPersonByUserId(locals.user!.id))!;
	const recipient = await prisma.actor.findFirst({
		where: { handle, ...publicActorWhere(new Date(), person.actorId), person: { isNot: null } },
		select: { id: true, handle: true, displayName: true }
	});
	if (!recipient) error(404, 'Profil introuvable');
	if (recipient.id === person.actorId) redirect(303, '/messages');
	const existing = await findConversationWith(person.actorId, recipient.id);
	if (existing) redirect(303, `/messages/${existing.id}`);
	return { recipient: { handle: recipient.handle, displayName: recipient.displayName } };
};

export const actions: Actions = {
	default: async ({ locals, url, request }) => {
		const person = (await getPersonByUserId(locals.user!.id))!;
		const body = String((await request.formData()).get('body') ?? '');
		let id: string;
		try {
			({ id } = await startConversation(
				person.actorId,
				url.searchParams.get('a')?.toLowerCase() ?? '',
				body
			));
		} catch (err) {
			if (err instanceof MessagingError) return fail(err.status, { error: err.message, body });
			throw err;
		}
		redirect(303, `/messages/${id}`);
	}
};
