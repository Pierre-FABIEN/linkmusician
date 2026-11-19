// LINKMUSICIAN: accueil de Melokiva Diagram (DIAGRAM-02) : la carte globale
// et la couverture par domaine.
import { requireDiagramReader } from '#server/diagram/access';
import { coverage, DIAGRAMS, PROCESSES } from '#server/diagram/catalog';
import { referenceData } from '#server/diagram/sources';
import { diagramPage } from '#server/diagram/views';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireDiagramReader(locals);
	const page = await diagramPage('global-carte');
	return {
		...page,
		crumbs: [{ label: 'Vue globale', href: '/diagram' }],
		coverage: coverage(referenceData),
		totals: {
			processes: PROCESSES.length,
			diagrams: DIAGRAMS.length,
			triggers: referenceData.code.triggers,
			missing: referenceData.code.missing.length
		}
	};
};
