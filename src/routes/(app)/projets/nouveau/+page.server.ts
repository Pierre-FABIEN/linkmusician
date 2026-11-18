// LINKMUSICIAN: créer un projet (P2, D72, conception 20 §7.1) : nom et type
// obligatoires, porteur « Moi » par défaut ou une structure que je gère
// (`?porteur=` présélectionne). Ne rapporte rien.
import { fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { manageableProjectOwners } from '#server/projects/access';
import { ProjectError, createProject } from '#server/projects/service';
import { newProjectSchema } from '#lib/schema/projects/project';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = await requirePerson(locals);
	const owners = await manageableProjectOwners(person.actorId);
	const wanted = url.searchParams.get('porteur');
	return {
		owners,
		defaultOwner: owners.some((o) => o.id === wanted && !o.isMe) ? wanted : ''
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const form = Object.fromEntries(await request.formData()) as Record<string, string>;
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
		redirect(303, `/projets/${id}?cree`);
	}
};
