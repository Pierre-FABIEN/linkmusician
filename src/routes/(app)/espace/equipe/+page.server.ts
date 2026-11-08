// LINKMUSICIAN: mon équipe (P3-12, conception 07 §3.3) : mes groupes (et
// leur rang, P3-08), mes partenaires réguliers (collaborations confirmées).
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { team } from '#lib/server/career/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	return team(person.actorId);
};
