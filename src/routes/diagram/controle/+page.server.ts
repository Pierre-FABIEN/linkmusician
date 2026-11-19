// LINKMUSICIAN: couverture et contrôle documentaire (DIAGRAM-02, DIAGRAM-06).
// Ne remplace pas les tests applicatifs : il signale les lacunes du catalogue.
import { requireDiagramReader } from '#server/diagram/access';
import { DIAGRAMS, PROBLEM_LABELS, controls, coverage } from '#server/diagram/catalog';
import { models, referenceData } from '#server/diagram/sources';
import { ROOT_CRUMB } from '#server/diagram/views';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireDiagramReader(locals);
	const problems = controls(referenceData, await models(DIAGRAMS.map((d) => d.id)));
	const groups = Object.entries(PROBLEM_LABELS).map(([kind, label]) => ({
		kind,
		label,
		items: problems.filter((p) => p.kind === kind)
	}));
	return {
		coverage: coverage(referenceData),
		code: referenceData.code,
		groups,
		crumbs: [ROOT_CRUMB, { label: 'Couverture et contrôle', href: '/diagram/controle' }]
	};
};
