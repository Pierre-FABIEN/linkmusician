// LINKMUSICIAN: annuaire des lieux (P2-14a, D27) : lieux autour de soi et
// recherche par nom. Une jam se tient toujours dans un lieu public ou
// professionnel de l'annuaire (D26).
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import {
	VALIDATING_TRUST_LEVEL,
	myPendingVenues,
	searchVenues,
	venuesNear
} from '#lib/server/venues/service';
import { getTrustLevel } from '#lib/server/trust/quotas';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const location = await getActorLocation(person.actorId);
	const canConfirm = (await getTrustLevel(person.actorId)) >= VALIDATING_TRUST_LEVEL;
	const [nearby, results, mine, toConfirm] = await Promise.all([
		location ? venuesNear(person.actorId) : Promise.resolve([]),
		q ? searchVenues(q) : Promise.resolve(null),
		// Validation des lieux (P2-14c, D26).
		myPendingVenues(person.actorId),
		location && canConfirm
			? venuesNear(person.actorId, { pending: true, limit: 10 })
			: Promise.resolve([])
	]);
	return {
		q,
		commune: location?.communeName ?? null,
		nearby,
		results,
		mine,
		toConfirm
	};
};
