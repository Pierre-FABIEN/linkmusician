// LINKMUSICIAN: carte de carrière (P3-13, conception 07 §2) : les huit
// actes, les épreuves franchies, la suite dans le brouillard. Calculée depuis
// les faits prouvés, jamais depuis l'XP.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { careerMapFor } from '#lib/server/career/map';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	return { map: await careerMapFor(person.actorId, person.ambition), ambition: person.ambition };
};
