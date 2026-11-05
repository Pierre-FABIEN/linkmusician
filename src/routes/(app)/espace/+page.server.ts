// LINKMUSICIAN: tableau de bord de progression (P1-11), calculé côté serveur
// (`#lib/server/progression/dashboard`).
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { getDashboard } from '#lib/server/progression/dashboard';
import type { PageServerLoad } from './$types';

/** Écrans déjà construits : un objectif qui mène ailleurs est affiché « bientôt ». */
const AVAILABLE = ['/profil', '/profil/musical', '/profil/ville', '/profil/medias'];

export const load: PageServerLoad = async ({ locals }) => {
	// La garde de `(app)/+layout.server.ts` a déjà vérifié compte et personne.
	const person = (await getPersonByUserId(locals.user!.id))!;
	const [dashboard, location] = await Promise.all([
		getDashboard(person.actorId),
		getActorLocation(person.actorId)
	]);
	return {
		dashboard: {
			...dashboard,
			objectives: dashboard.objectives.map((o) => ({
				...o,
				href: AVAILABLE.includes(o.href) ? o.href : null
			}))
		},
		commune: location?.communeName ?? null,
		hidden: person.actor.hidden
	};
};
