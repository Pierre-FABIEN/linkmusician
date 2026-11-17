/**
 * Trois niveaux de preuve d'une information de profil (ONB-12c3, #26).
 * Module pur. Un mot visible, jamais une couleur seule, et la même définition
 * partout (profil public, aide) :
 * - **déclaré** : indiqué par la personne, sans contrôle ;
 * - **confirmé** : confirmé par une autre personne (collaboration, concert,
 *   crédit, endossement) ;
 * - **vérifié** : contrôlé par une preuve (sortie publiée vérifiée,
 *   organisation vérifiée).
 *
 * Ce n'est ni un score ni de la confiance (`progression/core/trust`) : un
 * niveau qualifie une information, pas une personne.
 */
export const PROOF_LEVELS = ['DECLARED', 'CONFIRMED', 'VERIFIED'] as const;
export type ProofLevel = (typeof PROOF_LEVELS)[number];

export const PROOF_LEVEL_INFO: Readonly<Record<ProofLevel, { label: string; hint: string }>> = {
	DECLARED: { label: 'Déclaré', hint: 'Indiqué par la personne, sans contrôle.' },
	CONFIRMED: {
		label: 'Confirmé',
		hint: 'Confirmé par une autre personne : collaboration, concert, crédit.'
	},
	VERIFIED: {
		label: 'Vérifié',
		hint: 'Contrôlé par une preuve : sortie publiée, organisation vérifiée.'
	}
};
