// LINKMUSICIAN: « Hors projet » (P3, U2 ; conception 20 §4.3), à l'adresse des
// campagnes en cours (P3-12), conservée. Les mêmes morceaux qu'avant
// (`campaigns`), classés pour moi : ceux que je gère et qu'aucun de mes projets
// ne range, ceux déjà rangés, et ceux que d'autres gèrent (crédit, groupe dont
// je suis membre), que je ne range pas. Aucun morceau ne disparaît du parcours.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { outsideProjects } from '#server/projects/overview';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	// Les noms de mes projets y figurent : jamais en cache partagé.
	setHeaders({ 'cache-control': 'private, no-store' });
	return outsideProjects(person.actorId);
};
