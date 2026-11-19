// LINKMUSICIAN: « Mes projets » (P3, U2 ; conception 20 §4.2, §6 et §7) : une
// tuile par projet que je peux ouvrir, en cours d'abord ; les projets clos
// restent consultables. Une projection groupée (`projectsOverview`), jamais une
// lecture de fiche par tuile ; « Hors projet » en compteur (une requête).
// P4a : invitations en attente, avec seulement ce que §9.3 autorise.
import { requirePerson } from '#server/actors/tracksForm';
import { outsideCount, projectsOverview } from '#server/projects/overview';
import { projectSections } from '#lib/projects/overview';
import { myInvitations } from '#server/projects/participants';
import { answerInvitationForm } from '#server/projects/answer-form';
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
	// P4a, U3 : répondre à une invitation (la personne elle-même ; relu sous verrou).
	repondre: answerInvitationForm
};
