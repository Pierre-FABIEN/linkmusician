// LINKMUSICIAN: liste minimale des projets que je gère (P2, D72). Le tableau
// « Mes projets » en tuiles (P3, U2) la remplacera ; l'adresse reste.
import { requirePerson } from '#server/actors/tracksForm';
import { myProjects } from '#server/projects/view';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	const person = await requirePerson(locals);
	// Pages de projet jamais en cache partagé (conception 19 §9.3).
	setHeaders({ 'cache-control': 'private, no-store' });
	return { projects: await myProjects(person.actorId) };
};
