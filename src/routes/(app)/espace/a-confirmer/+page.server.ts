// LINKMUSICIAN: ce qui attend ma réponse (P2-06, P3-01, P3-11) :
// collaborations à confirmer, crédits de morceaux, invitations de groupe.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { pendingForMe } from '#lib/server/collaborations/service';
import { bandCounts } from '#lib/server/bands/service';
import { pendingCredits } from '#lib/server/works/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const [toConfirm, bands, workCredits] = await Promise.all([
		pendingForMe(person.actorId),
		bandCounts(person.actorId),
		pendingCredits(person.actorId)
	]);
	return { toConfirm, bandInvitations: bands.invitations, workCredits };
};
