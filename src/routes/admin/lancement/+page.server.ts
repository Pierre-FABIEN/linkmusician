// LINKMUSICIAN: feuille de route de la startup (`docs/lancement/README.md`),
// réservée à l'administration (garde du layout `admin`). Jamais publique.
import { renderedLaunchRoadmap } from '#lib/server/aide/render';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ roadmap: renderedLaunchRoadmap() });
