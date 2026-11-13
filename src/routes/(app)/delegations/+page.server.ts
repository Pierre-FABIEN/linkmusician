import { requirePerson } from '#server/actors/tracksForm';
import { myDelegations, delegationOptions } from '#server/representation/delegations';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, url }) => {
	const person = await requirePerson(locals);
	const [delegations, options] = await Promise.all([
		myDelegations(person.actorId, url.searchParams.get('agence') ?? undefined),
		delegationOptions(person.actorId)
	]);
	return { delegations, canPropose: options.mandates.length > 0 && options.agencies.length > 0 };
};
