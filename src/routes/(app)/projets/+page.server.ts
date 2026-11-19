// LINKMUSICIAN: « Mes projets » (P3, U2 ; conception 20 §4.2, §6 et §7) : une
// tuile par projet que je peux ouvrir, en cours d'abord ; les projets clos
// restent consultables. Une projection groupée (`projectsOverview`), jamais une
// lecture de fiche par tuile ; « Hors projet » en compteur (une requête).
// P4a : invitations en attente, avec seulement ce que §9.3 autorise.
import { requirePerson } from '#server/actors/tracksForm';
import { outsideCount, projectsOverview } from '#server/projects/overview';
import { projectSections } from '#lib/projects/overview';
import { answerInvitation, myInvitations } from '#server/projects/participants';
import { ProjectError } from '#server/projects/service';
import { answerSchema } from '#lib/schema/projects/project';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	const person = await requirePerson(locals);
	// Pages de projet jamais en cache partagé (conception 19 §9.3).
	setHeaders({ 'cache-control': 'private, no-store' });
	const [projects, outside, invitations] = await Promise.all([
		projectsOverview(person.actorId),
		outsideCount(person.actorId),
		myInvitations(person.actorId)
	]);
	return { sections: projectSections(projects), total: projects.length, outside, invitations };
};

export const actions: Actions = {
	// P4a : répondre à une invitation (la personne elle-même ; relu sous verrou).
	repondre: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const parsed = answerSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: 'Réponse invalide.' });
		const accept = parsed.data.answer === 'accept';
		let projectId: string;
		try {
			({ projectId } = await answerInvitation(person.actorId, parsed.data.participantId, accept));
		} catch (err) {
			if (err instanceof ProjectError) return fail(err.status, { error: err.message });
			throw err;
		}
		if (accept) redirect(303, `/projets/${projectId}?rejoint`);
		return { ok: 'Invitation refusée. Personne d’autre n’en est prévenu.' };
	}
};
