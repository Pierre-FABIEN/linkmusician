/**
 * LINKMUSICIAN: une discussion de groupe (P3-16c, D46). Avant d'avoir
 * rejoint : l'invitation seule (Rejoindre, Non merci). Ensuite : le fil,
 * l'envoi, quitter ; l'auteur invite d'autres contacts. Polling côté page (D8).
 */
import { error, fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import {
	DiscussionError,
	declineDiscussion,
	invitableContacts,
	inviteToDiscussion,
	joinDiscussion,
	leaveDiscussion,
	openDiscussion,
	postToDiscussion
} from '#lib/server/discussions/service';
import { myContacts } from '#lib/server/contacts/service';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals, params, depends }) => {
	depends('app:discussion');
	const { actorId } = await me(locals);
	try {
		const discussion = await openDiscussion(actorId, params.id);
		const invitable =
			discussion.access === 'member' && discussion.iAmCreator
				? await invitableContacts(actorId, params.id, await myContacts(actorId))
				: [];
		return {
			discussion,
			invitable: invitable.map((c) => ({ handle: c.handle, displayName: c.displayName }))
		};
	} catch (err) {
		if (err instanceof DiscussionError) error(err.status, err.message);
		throw err;
	}
};

/** Lance l'intention ; une erreur métier devient un message à l'écran. */
async function attempt<T>(fn: () => Promise<T>) {
	try {
		return { ok: true as const, value: await fn() };
	} catch (err) {
		if (err instanceof DiscussionError)
			return { ok: false as const, failure: fail(err.status, { error: err.message }) };
		throw err;
	}
}

export const actions: Actions = {
	join: async ({ locals, params }) => {
		const r = await attempt(async () => joinDiscussion((await me(locals)).actorId, params.id));
		return r.ok ? { message: 'Tu as rejoint la discussion.' } : r.failure;
	},
	decline: async ({ locals, params }) => {
		const r = await attempt(async () => declineDiscussion((await me(locals)).actorId, params.id));
		if (!r.ok) return r.failure;
		redirect(303, '/messages');
	},
	leave: async ({ locals, params }) => {
		const r = await attempt(async () => leaveDiscussion((await me(locals)).actorId, params.id));
		if (!r.ok) return r.failure;
		redirect(303, '/messages');
	},
	send: async ({ locals, params, request }) => {
		const body = String((await request.formData()).get('body') ?? '');
		const r = await attempt(async () =>
			postToDiscussion((await me(locals)).actorId, params.id, body)
		);
		return r.ok ? { ok: true } : r.failure;
	},
	invite: async ({ locals, params, request }) => {
		const handle = String((await request.formData()).get('handle') ?? '');
		const r = await attempt(async () =>
			inviteToDiscussion((await me(locals)).actorId, params.id, handle)
		);
		return r.ok ? { message: `${r.value.displayName} est invité·e.` } : r.failure;
	}
};
