// LINKMUSICIAN: mode jam (P2-14b), écran « Jams à venir » (D50) : le
// calendrier des jams autour de moi et les lieux de jam.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { venuesNear } from '#lib/server/venues/service';
import { upcomingJamsNear } from '#lib/server/jam/publicJams';
import { parisDayKey } from '#lib/jam/calendar';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const location = await getActorLocation(person.actorId);
	const [jams, venues] = await Promise.all([
		location ? upcomingJamsNear(person.actorId) : Promise.resolve([]),
		location ? venuesNear(person.actorId, { limit: 3 }) : Promise.resolve([])
	]);
	return {
		commune: location?.communeName ?? null,
		jams,
		venues,
		calendarDate: parisDayKey(jams[0]?.startsAt ?? new Date())
	};
};
