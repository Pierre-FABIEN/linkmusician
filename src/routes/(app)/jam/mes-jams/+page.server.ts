// LINKMUSICIAN: mode jam, écran « Mes jams » (D50) : les invitations du lead
// (P2-14c) et les dernières jams, « Tu y étais ? » (P2-15).
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { myJamInvites } from '#lib/server/jam/publicJams';
import { myRecentJams } from '#lib/server/jam/afterJam';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const [invites, recent] = await Promise.all([
		myJamInvites(person.actorId),
		myRecentJams(person.actorId)
	]);
	return { invites, recent };
};
