// LINKMUSICIAN: « Mes projets » (P3, U2 ; conception 20 §4.2, §6 et §7) : une
// tuile par projet que je peux ouvrir, en cours d'abord ; les projets clos
// restent consultables. Une projection groupée (`projectsOverview`), jamais une
// lecture de fiche par tuile ; « Hors projet » en compteur (une requête).
import { requirePerson } from '#server/actors/tracksForm';
import { outsideCount, projectsOverview } from '#server/projects/overview';
import { projectSections } from '#lib/projects/overview';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	const person = await requirePerson(locals);
	// Pages de projet jamais en cache partagé (conception 19 §9.3).
	setHeaders({ 'cache-control': 'private, no-store' });
	const [projects, outside] = await Promise.all([
		projectsOverview(person.actorId),
		outsideCount(person.actorId)
	]);
	return { sections: projectSections(projects), total: projects.length, outside };
};
