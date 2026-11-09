// LINKMUSICIAN: points, succès et confiance (P1-11), écran du menu carrière.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getDashboard } from '#lib/server/progression/dashboard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const d = await getDashboard(person.actorId);
	return { trust: d.trust, achievements: d.achievements, level: d.level, xp: d.xp };
};
