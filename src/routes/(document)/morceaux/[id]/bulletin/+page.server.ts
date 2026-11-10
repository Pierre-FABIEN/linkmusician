// LINKMUSICIAN: bulletin de partage d'un morceau (P3-15b), pour son équipe.
import { error } from '@sveltejs/kit';
import { sharingSheetFor } from '#lib/server/demarches/documents';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params }) => {
	const { actorId } = await parent();
	const doc = await sharingSheetFor(params.id, actorId);
	if (!doc) error(404, 'Morceau introuvable');
	return doc;
};
