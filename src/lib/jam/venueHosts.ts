/**
 * Animateur·rices des scènes ouvertes d'un lieu (P5-04b, conception 08 §14).
 * Module pur, partagé par le serveur et le navigateur.
 *
 * Les suggestions se trient sur des **faits** : personnes différentes qui
 * ont apprécié la personne (jams et collaborations, appréciations non
 * reprises), puis jams de lieu animées et tenues, puis la distance. Jamais
 * l'XP (invariant).
 */

/** Invitations à animer en attente, par lieu. */
export const MAX_PENDING_HOST_INVITES = 5;
/** Animateur·rices actif·ves, par lieu. */
export const MAX_VENUE_HOSTS = 10;
/** Rayon des suggestions autour du lieu. */
export const LEAD_SUGGESTION_RADIUS_KM = 30;
/** Suggestions montrées à la gestion du lieu. */
export const MAX_LEAD_SUGGESTIONS = 6;

export type LeadCandidateFacts = {
	/** Personnes différentes qui l'ont appréciée. */
	endorsers: number;
	/** Jams de lieu tenues dont elle était lead. */
	jamsLed: number;
	meters: number;
};

/** Ordre des suggestions : appréciations, jams animées, puis la plus proche. */
export function compareLeadCandidates(a: LeadCandidateFacts, b: LeadCandidateFacts): number {
	return b.endorsers - a.endorsers || b.jamsLed - a.jamsLed || a.meters - b.meters;
}

/** Ce qui justifie la suggestion, en une ligne (« Appréciée par 4 personnes · 2 jams animées »). */
export function leadSuggestionFacts(facts: Pick<LeadCandidateFacts, 'endorsers' | 'jamsLed'>) {
	const parts: string[] = [];
	if (facts.endorsers > 0) {
		parts.push(
			facts.endorsers === 1
				? 'Appréciation d’une personne'
				: `Appréciations de ${facts.endorsers} personnes`
		);
	}
	if (facts.jamsLed > 0) {
		parts.push(facts.jamsLed === 1 ? '1 jam animée' : `${facts.jamsLed} jams animées`);
	}
	return parts.length > 0 ? parts.join(' · ') : 'Prêt·e à organiser des jams';
}
