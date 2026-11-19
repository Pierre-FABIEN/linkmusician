// LINKMUSICIAN: vues transversales du menu (DIAGRAM-02) : parcours, dataflows,
// permissions, données, états, événements, évolutions.
import { error } from '@sveltejs/kit';
import { requireDiagramReader } from '#server/diagram/access';
import { VIEWS, type ViewId } from '#server/diagram/catalog';
import { ROOT_CRUMB, viewPage } from '#server/diagram/views';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireDiagramReader(locals);
	const view = VIEWS.find((v) => v.id === params.vue);
	if (!view) error(404, 'Vue introuvable');
	return {
		view: { id: view.id as ViewId, label: view.label },
		...viewPage(view.id),
		crumbs: [ROOT_CRUMB, { label: view.label, href: `/diagram/vues/${view.id}` }]
	};
};
