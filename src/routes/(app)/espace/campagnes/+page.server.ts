// LINKMUSICIAN: campagnes en cours (P3-12, conception 07 §3.2) : chaque
// morceau, son état et ses places libres (rôles à pourvoir, P3-11).
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { campaigns } from '#lib/server/career/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	return campaigns(person.actorId);
};
