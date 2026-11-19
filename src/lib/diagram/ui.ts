/**
 * LINKMUSICIAN: aides d'affichage de Melokiva Diagram (DIAGRAM-02), pures et
 * partagées par les composants. Aucune donnée métier ici.
 */
import type { DeliveryStatus } from './types';

/** Ton Metro d'un statut : le mot l'accompagne toujours (jamais la couleur seule). */
export const STATUS_TONES: Readonly<Record<DeliveryStatus, string>> = {
	TESTED: 'lime',
	IMPLEMENTED: 'cyan',
	DESIGNED: 'amber',
	PLANNED: 'paper',
	DEPRECATED: 'ink'
};

/** Tons sombres : texte clair par-dessus. */
export const DARK_TONES = new Set(['violet', 'rose', 'blue', 'ink']);

export const normalizeQuery = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[·’']/g, ' ')
		.toLowerCase()
		.trim();

/** Lien vers une issue GitHub du dépôt. */
export const issueHref = (n: number) => `https://github.com/Pierre-FABIEN/linkmusician/issues/${n}`;

export interface Crumb {
	label: string;
	href: string;
}
