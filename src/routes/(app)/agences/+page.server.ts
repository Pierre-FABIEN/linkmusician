import { requirePerson } from '#server/actors/tracksForm';
import { myStructures } from '#server/organizations/structures';
import { canCreateAgency } from '#server/agencies/service';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	const [all, canCreate] = await Promise.all([
		myStructures(person.actorId),
		canCreateAgency(person.actorId)
	]);
	return { agencies: all.filter((s) => s.kind === 'AGENCY'), canCreate };
};
