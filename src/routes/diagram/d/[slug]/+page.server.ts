// LINKMUSICIAN: un diagramme (DIAGRAM-03). Garde rappelée : chaque lecture.
import { requireDiagramReader } from '#server/diagram/access';
import { diagramPage } from '#server/diagram/views';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireDiagramReader(locals);
	return diagramPage(params.slug);
};
