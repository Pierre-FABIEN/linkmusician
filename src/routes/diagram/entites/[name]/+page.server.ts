// LINKMUSICIAN: une entité Prisma et tout ce qui l'utilise (DIAGRAM-02).
import { requireDiagramReader } from '#server/diagram/access';
import { entityPage } from '#server/diagram/views';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireDiagramReader(locals);
	return entityPage(params.name);
};
