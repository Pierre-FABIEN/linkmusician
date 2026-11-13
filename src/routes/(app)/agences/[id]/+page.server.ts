import { error } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { agencyForMe } from '#server/agencies/service';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, params }) => {
	const person = await requirePerson(locals);
	const agency = await agencyForMe(params.id, person.actorId);
	if (!agency) error(404, 'Participation introuvable.');
	return { agency };
};
