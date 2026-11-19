// LINKMUSICIAN: créer un projet (P2, D72, conception 20 §7.1) : nom et type
// obligatoires, porteur « Moi » par défaut ou une structure que je gère
// (`?porteur=` présélectionne). Ne rapporte rien. U3 : `?contacts=<groupe>`
// transforme un groupe de contacts en projet : chaque contact coché reçoit une
// invitation (personne n'est ajouté sans accepter), relue par `inviteMany`.
import { fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { manageableProjectOwners } from '#server/projects/access';
import { ProjectError, createProject } from '#server/projects/service';
import { newProjectSchema } from '#lib/schema/projects/project';
import { inviteMany } from '#server/projects/participants';
import { myContactGroups } from '#server/contacts/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = await requirePerson(locals);
	const owners = await manageableProjectOwners(person.actorId);
	const wanted = url.searchParams.get('porteur');
	const groupId = url.searchParams.get('contacts');
	const group = groupId
		? ((await myContactGroups(person.actorId)).find((g) => g.id === groupId) ?? null)
		: null;
	return {
		owners,
		group: group && {
			id: group.id,
			name: group.name,
			members: group.members.map((m) => ({ id: m.id, name: m.displayName }))
		},
		defaultOwner: owners.some((o) => o.id === wanted && !o.isMe) ? wanted : ''
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const formData = await request.formData();
		const form = Object.fromEntries(formData) as Record<string, string>;
		const values = {
			name: form.name ?? '',
			kind: form.kind ?? '',
			owner: form.owner ?? '',
			description: form.description ?? '',
			startsOn: form.startsOn ?? '',
			dueOn: form.dueOn ?? ''
		};
		const parsed = newProjectSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, {
				values,
				error: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.'
			});
		}
		let id: string;
		try {
			({ id } = await createProject(person.actorId, parsed.data));
		} catch (err) {
			if (err instanceof ProjectError) return fail(err.status, { values, error: err.message });
			throw err;
		}
		// Groupe de contacts : seulement ses membres (relus), seulement les cochés.
		const groupId = typeof form.contactGroup === 'string' ? form.contactGroup : '';
		if (!groupId) redirect(303, `/projets/${id}?cree`);
		const group = (await myContactGroups(person.actorId)).find((g) => g.id === groupId);
		const wanted = new Set(formData.getAll('invite').map(String));
		const ids = (group?.members ?? []).map((m) => m.id).filter((m) => wanted.has(m));
		const result = ids.length
			? await inviteMany(person.actorId, id, ids)
			: { invited: [], skipped: 0, quota: null };
		redirect(303, `/projets/${id}?cree&invites=${result.invited.length}&sans=${result.skipped}`);
	}
};
