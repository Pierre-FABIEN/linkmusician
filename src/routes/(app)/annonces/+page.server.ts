// LINKMUSICIAN: annonces autour de moi et mes annonces (P2-02).
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { listMine, listNearby } from '#lib/server/opportunities/service';
import { listMyApplications } from '#lib/server/opportunities/applications';
import { OPPORTUNITY_KINDS, type OpportunityKindValue } from '#lib/opportunities/rules';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const type = url.searchParams.get('type');
	const kind = (OPPORTUNITY_KINDS as readonly string[]).includes(type ?? '')
		? (type as OpportunityKindValue)
		: null;
	const location = await getActorLocation(person.actorId);
	const [nearby, mine, applications] = await Promise.all([
		location ? listNearby(person.actorId, { kind }) : Promise.resolve([]),
		listMine(person.actorId),
		listMyApplications(person.actorId)
	]);
	return { kind, commune: location?.communeName ?? null, nearby, mine, applications };
};
