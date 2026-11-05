// LINKMUSICIAN: annuaire des lieux (P2-14a, D27) : lieux autour de soi et
// recherche par nom. Une jam se tient toujours dans un lieu public ou
// professionnel de l'annuaire (D26).
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { searchVenues, venuesNear } from '#lib/server/venues/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const location = await getActorLocation(person.actorId);
	const [nearby, results] = await Promise.all([
		location ? venuesNear(person.actorId) : Promise.resolve([]),
		q ? searchVenues(q) : Promise.resolve(null)
	]);
	return {
		q,
		commune: location?.communeName ?? null,
		nearby,
		results
	};
};
