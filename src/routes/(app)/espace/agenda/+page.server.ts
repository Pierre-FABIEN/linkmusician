// LINKMUSICIAN: agenda (P3-12, conception 07 §4.2) : jams et collaborations
// à venir.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { agenda } from '#lib/server/career/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	return { items: await agenda(person.actorId) };
};
