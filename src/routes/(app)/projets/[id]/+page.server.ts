// LINKMUSICIAN: fiche minimale et privée d'un projet (P2, D72). Une seule
// lecture serveur (`projectView`) : projet inexistant ou inaccessible, même
// 404 ; un élément non partagé n'arrive jamais jusqu'au navigateur. Chaque
// action relit les droits sous verrou (service), l'identité vient de la session.
import { error, fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { projectView, rangeableWorks } from '#server/projects/view';
import {
	PROJECT_NOT_FOUND,
	ProjectError,
	addProjectItem,
	deleteProject,
	removeProjectItem,
	setProjectStatus,
	updateProject,
	updateProjectItemShare
} from '#server/projects/service';
import {
	addItemSchema,
	editProjectSchema,
	itemRefSchema,
	itemShareSchema,
	projectStatusSchema
} from '#lib/schema/projects/project';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	const person = await requirePerson(locals);
	setHeaders({ 'cache-control': 'private, no-store' });
	const project = await projectView(params.id, person.actorId);
	if (!project) error(404, PROJECT_NOT_FOUND);
	return {
		project,
		rangeable: project.status === 'ACTIVE' ? await rangeableWorks(person.actorId, project.id) : []
	};
};

type Result = { ok?: string; error?: string; action?: string };

async function run(action: string, fn: () => Promise<unknown>, ok: string) {
	try {
		await fn();
	} catch (err) {
		if (err instanceof ProjectError) return fail(err.status, { action, error: err.message });
		throw err;
	}
	return { action, ok } satisfies Result;
}

async function formOf(request: Request) {
	return Object.fromEntries(await request.formData()) as Record<string, string>;
}

const invalid = (action: string, issues: { message: string }[]) =>
	fail(400, { action, error: issues[0]?.message ?? 'Vérifie le formulaire.' });

export const actions: Actions = {
	ranger: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = addItemSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('ranger', parsed.error.issues);
		return run(
			'ranger',
			() => addProjectItem(person.actorId, params.id, parsed.data),
			'Morceau rangé. Il reste à toi, avec ses crédits.'
		);
	},
	partage: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = itemShareSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('partage', parsed.error.issues);
		return run(
			'partage',
			() => updateProjectItemShare(person.actorId, params.id, parsed.data),
			'Partage mis à jour.'
		);
	},
	retirer: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = itemRefSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('retirer', parsed.error.issues);
		return run(
			'retirer',
			() => removeProjectItem(person.actorId, params.id, parsed.data.itemId),
			'Morceau retiré du projet. Le morceau lui-même n’a pas changé.'
		);
	},
	modifier: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = editProjectSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('modifier', parsed.error.issues);
		return run(
			'modifier',
			() => updateProject(person.actorId, params.id, parsed.data),
			'Projet mis à jour.'
		);
	},
	etat: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const parsed = projectStatusSchema.safeParse(await formOf(request));
		if (!parsed.success) return invalid('etat', parsed.error.issues);
		return run(
			'etat',
			() => setProjectStatus(person.actorId, params.id, parsed.data.status),
			'État du projet mis à jour.'
		);
	},
	supprimer: async ({ locals, params }) => {
		const person = await requirePerson(locals);
		try {
			await deleteProject(person.actorId, params.id);
		} catch (err) {
			if (err instanceof ProjectError)
				return fail(err.status, { action: 'supprimer', error: err.message });
			throw err;
		}
		redirect(303, '/projets?supprime');
	}
};
