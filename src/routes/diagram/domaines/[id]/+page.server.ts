// LINKMUSICIAN: un domaine (DIAGRAM-02) : diagrammes et processus inventoriés.
import { requireDiagramReader } from '#server/diagram/access';
import { domainPage } from '#server/diagram/views';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireDiagramReader(locals);
	return domainPage(params.id);
};
