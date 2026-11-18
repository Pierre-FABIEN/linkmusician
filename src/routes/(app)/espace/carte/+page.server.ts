// LINKMUSICIAN: carte de carrière (P3-13 ; carte parallèle N2, conception 21
// §10, D73 Q-NL-1) : des branches indépendantes, jusqu'à trois épreuves à
// portée, aucun « acte en cours ». Calculée depuis les faits prouvés et les
// faits déclencheurs, jamais depuis l'XP. Privée : la personne elle-même.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { careerMapFor } from '#lib/server/career/map';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	return { map: await careerMapFor(person.actorId, person.ambition), ambition: person.ambition };
};
