// LINKMUSICIAN: programme des œuvres d'un concert (P3-15b), pour les membres du groupe.
import { error } from '@sveltejs/kit';
import { concertProgramFor } from '#lib/server/demarches/documents';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params }) => {
	const { actorId } = await parent();
	const doc = await concertProgramFor(params.handle, actorId);
	if (!doc) error(404, 'Groupe introuvable');
	return doc;
};
