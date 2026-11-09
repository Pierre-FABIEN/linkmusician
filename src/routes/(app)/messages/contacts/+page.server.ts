// LINKMUSICIAN: carnet de contacts (P3-16b, D45, D46) : les gens avec qui
// l'on a joué ou échangé, et ses groupes de contacts (projets potentiels).
import { fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import {
	ContactError,
	addToContactGroup,
	createContactGroup,
	deleteContactGroup,
	myContactGroups,
	myContacts,
	removeFromContactGroup,
	renameContactGroup
} from '#lib/server/contacts/service';
import { leaveNetwork, NetworkError } from '#lib/server/network/service';
import { DiscussionError, openFromContactGroup } from '#lib/server/discussions/service';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals }) => {
	const { actorId } = await me(locals);
	const [contacts, groups] = await Promise.all([myContacts(actorId), myContactGroups(actorId)]);
	return { contacts, groups };
};

async function run(locals: App.Locals, fn: (actorId: string) => Promise<unknown>, message: string) {
	const { actorId } = await me(locals);
	try {
		await fn(actorId);
		return { message };
	} catch (err) {
		if (err instanceof ContactError || err instanceof NetworkError) {
			return fail(err.status, { error: err.message });
		}
		throw err;
	}
}

async function fields(request: Request) {
	const form = await request.formData();
	return (name: string) => String(form.get(name) ?? '');
}

export const actions: Actions = {
	createGroup: async ({ locals, request }) => {
		const f = await fields(request);
		return run(locals, (id) => createContactGroup(id, f('name')), 'Groupe créé.');
	},
	renameGroup: async ({ locals, request }) => {
		const f = await fields(request);
		return run(locals, (id) => renameContactGroup(id, f('groupId'), f('name')), 'C’est renommé.');
	},
	deleteGroup: async ({ locals, request }) => {
		const f = await fields(request);
		return run(locals, (id) => deleteContactGroup(id, f('groupId')), 'Groupe supprimé.');
	},
	addToGroup: async ({ locals, request }) => {
		const f = await fields(request);
		return run(
			locals,
			(id) => addToContactGroup(id, f('groupId'), f('handle')),
			'Ajouté au groupe.'
		);
	},
	removeFromGroup: async ({ locals, request }) => {
		const f = await fields(request);
		return run(
			locals,
			(id) => removeFromContactGroup(id, f('groupId'), f('contactId')),
			'Retiré du groupe.'
		);
	},
	/** Discussion de groupe (P3-16c) : chaque personne du groupe est invitée. */
	openDiscussion: async ({ locals, request }) => {
		const f = await fields(request);
		const { actorId } = await me(locals);
		let id: string;
		try {
			id = (await openFromContactGroup(actorId, f('groupId'))).id;
		} catch (err) {
			if (err instanceof DiscussionError) return fail(err.status, { error: err.message });
			throw err;
		}
		redirect(303, `/messages/groupes/${id}`);
	},
	leaveCarnet: async ({ locals, request }) => {
		const f = await fields(request);
		return run(locals, (id) => leaveNetwork(id, f('handle')), 'Retiré de ton carnet.');
	}
};
