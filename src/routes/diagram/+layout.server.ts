// LINKMUSICIAN: Melokiva Diagram (DIAGRAM-02, D80). Garde serveur, en-têtes
// privés et menu léger (titres et liens, aucun détail). Chaque page et chaque
// endpoint de `/diagram` rappelle la garde : un `load` de layout ne protège
// pas un endpoint, et masquer une entrée de menu ne protège rien.
import { requireDiagramReader, PRIVATE_HEADERS } from '#server/diagram/access';
import { menu } from '#server/diagram/catalog';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, setHeaders }) => {
	requireDiagramReader(locals);
	setHeaders(PRIVATE_HEADERS);
	return { menu: menu() };
};
