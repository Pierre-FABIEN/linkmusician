// LINKMUSICIAN: mode jam (P2-12, D21) : les jams ouvertes autour de moi et
// « Lancer une jam ». « Je suis dispo » et les salons arrivent avec P2-13 à P2-16.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { listNearby } from '#lib/server/opportunities/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const location = await getActorLocation(person.actorId);
	return {
		commune: location?.communeName ?? null,
		jams: location ? await listNearby(person.actorId, { kind: 'JAM' }) : []
	};
};
