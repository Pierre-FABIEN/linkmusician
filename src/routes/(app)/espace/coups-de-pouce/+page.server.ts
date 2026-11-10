// LINKMUSICIAN: coups de pouce (P4-13a, conception 07 §4.7) : des marches
// faciles tirées du réseau réel. Rien n'est écrit, rien n'est notifié.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { nudgesFor } from '#lib/server/career/nudges';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const { nudges } = await nudgesFor(person.actorId);
	return { nudges };
};
