// LINKMUSICIAN: journal de bord (P2-11, P3-12) : les derniers gains et leur
// raison, du plus récent au plus ancien. Privé (D1).
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getDashboard } from '#lib/server/progression/dashboard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	return { history: (await getDashboard(person.actorId)).history };
};
