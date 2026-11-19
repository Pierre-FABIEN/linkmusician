// LINKMUSICIAN: un processus de l'inventaire (DIAGRAM-02).
import { requireDiagramReader } from '#server/diagram/access';
import { processPage } from '#server/diagram/views';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireDiagramReader(locals);
	return processPage(params.id);
};
