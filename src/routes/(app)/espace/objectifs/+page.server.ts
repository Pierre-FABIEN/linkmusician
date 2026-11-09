// LINKMUSICIAN: mes objectifs (P1-11, P3-12) : les trois prochains, mis en
// avant selon l'ambition, et l'avancement global.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getDashboard } from '#lib/server/progression/dashboard';
import { linkable } from '#lib/server/career/service';
import { ambitionPriorities } from '#lib/career/ambition';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const d = await getDashboard(person.actorId, ambitionPriorities(person.ambition));
	return {
		objectives: linkable(d.objectives),
		questProgress: d.questProgress,
		ambition: person.ambition
	};
};
