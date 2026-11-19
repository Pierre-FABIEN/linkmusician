// LINKMUSICIAN: entités Prisma citées par le catalogue (DIAGRAM-02).
import { requireDiagramReader } from '#server/diagram/access';
import { entitiesInUse } from '#server/diagram/catalog';
import { ROOT_CRUMB } from '#server/diagram/views';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireDiagramReader(locals);
	return {
		entities: entitiesInUse(),
		crumbs: [ROOT_CRUMB, { label: 'Entités', href: '/diagram/entites' }]
	};
};
