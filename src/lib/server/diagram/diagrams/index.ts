/**
 * LINKMUSICIAN: liste des diagrammes détaillés (DIAGRAM-01). Ajouter un
 * diagramme : son fichier ici, sa source `.drawio`, puis `npm run diagram:sync`.
 */
import type { DiagramDefinition } from '#lib/diagram/types';
import { COULOIRS_BESOIN } from './couloirs-besoin';
import { DATAFLOW_BESOIN } from './dataflow-besoin';
import { DONNEES_PROJETS } from './donnees-projets';
import { ETATS_BESOIN, ETATS_PARTICIPATION } from './etats';
import { GLOBAL_CARTE } from './global';
import { PARCOURS_GROUPE_EP } from './parcours-groupe-ep';

export const DIAGRAMS: readonly DiagramDefinition[] = [
	GLOBAL_CARTE,
	PARCOURS_GROUPE_EP,
	COULOIRS_BESOIN,
	DATAFLOW_BESOIN,
	DONNEES_PROJETS,
	ETATS_BESOIN,
	ETATS_PARTICIPATION
];
