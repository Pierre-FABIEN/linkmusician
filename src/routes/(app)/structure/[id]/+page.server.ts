import { error } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { myStructure } from '#lib/server/organizations/structures';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, params }) => {
	const person = await requirePerson(locals);
	const structure = await myStructure(params.id, person.actorId);
	if (!structure) error(404, 'Participation introuvable');
	return { structure };
};
