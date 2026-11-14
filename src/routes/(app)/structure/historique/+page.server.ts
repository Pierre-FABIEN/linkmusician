import { requirePerson } from '#server/actors/tracksForm';
import { myComanagementHistory } from '#lib/server/organizations/structures';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	return { periods: await myComanagementHistory(person.actorId) };
};
