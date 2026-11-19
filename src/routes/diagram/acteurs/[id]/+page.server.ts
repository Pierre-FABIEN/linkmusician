// LINKMUSICIAN: un métier, une structure ou un rôle (DIAGRAM-02).
import { requireDiagramReader } from '#server/diagram/access';
import { actorPage } from '#server/diagram/views';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireDiagramReader(locals);
	return actorPage(params.id);
};
