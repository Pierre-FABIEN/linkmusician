import { error } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { representationActivityForMe } from '#server/representation/history';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const history = await representationActivityForMe(
		params.id,
		(await requirePerson(locals)).actorId
	);
	if (!history) error(404, 'Accompagnement introuvable.');
	return { history };
};
