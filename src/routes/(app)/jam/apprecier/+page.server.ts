// LINKMUSICIAN: « Mes jams récentes » (P2-15, D50, D81) : la jam en
// cours et celles des 7 derniers jours, chacune menant à « Qui était là ? ».
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { crossedJams } from '#lib/server/jam/afterJam';
import { crossedStatus } from '#lib/jam/afterJam';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const now = new Date();
	const jams = await crossedJams(person.actorId, now);
	return { jams: jams.map((j) => ({ ...j, ...crossedStatus(j, now) })) };
};
