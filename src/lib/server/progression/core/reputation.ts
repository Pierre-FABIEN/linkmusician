/**
 * Réputation (conception 02 §1, P2-08) : « Peut-on compter sur lui ? ». Ce
 * que **d'autres** confirment, jamais ce que la personne déclare, et jamais
 * l'XP (règle d'étanchéité) : `ReputationFacts` n'a aucun champ d'XP, de
 * niveau ni de palier de confiance.
 *
 * La réputation se montre en carte de signaux. Le score interne ne sert qu'au
 * tri de la recherche et n'est jamais affiché ni renvoyé au client.
 *
 * Module pur.
 */

/** Réactivité aux demandes reçues : `FAST` < 24 h, `DAY` < 48 h, sinon `SLOW`. */
export type ResponseBucket = 'FAST' | 'DAY' | 'SLOW';

export type ReputationFacts = {
	confirmedCollabs: number;
	distinctCounterparts: number;
	corroboratedGigs: number;
	verifiedReleases: number;
	bands: number;
	/** Personnes distinctes dont une appréciation est encore active. */
	distinctEndorsers: number;
	/** Appréciations actives par libellé, des plus fréquentes. */
	endorsementsByKind: { label: string; count: number }[];
	responseBucket: ResponseBucket | null;
};

/** Demandes reçues regardées pour la réactivité (jours). */
export const RESPONSE_WINDOW_DAYS = 180;
/** Une demande sans réponse depuis ce délai compte comme une réponse lente. */
export const UNANSWERED_AFTER_DAYS = 7;
/** En dessous, on ne dit rien de la réactivité : trop peu de demandes. */
export const MIN_RESPONSE_SAMPLE = 3;

/**
 * Réactivité à partir des délais de réponse aux demandes reçues, en heures
 * (`null` : restée sans réponse au-delà de `UNANSWERED_AFTER_DAYS`). On prend
 * la médiane : un seul oubli ne fait pas d'une personne réactive une personne
 * lente. Les demandes refusées et celles encore trop récentes ne sont pas
 * passées ici (refuser est une réponse).
 */
export function responseBucket(delaysHours: readonly (number | null)[]): ResponseBucket | null {
	if (delaysHours.length < MIN_RESPONSE_SAMPLE) return null;
	const sorted = delaysHours.map((d) => d ?? Infinity).sort((a, b) => a - b);
	const median = sorted[Math.floor((sorted.length - 1) / 2)];
	if (median < 24) return 'FAST';
	if (median < 48) return 'DAY';
	return 'SLOW';
}

/**
 * Poids du score interne. Chaque compte passe par `ln(1 + n)` : le dixième
 * concert vaut moins que le premier, et faire gonfler un compteur avec une
 * même personne (rendements décroissants déjà appliqués en amont) rapporte
 * peu. Les personnes **distinctes** pèsent plus que les répétitions.
 */
export const SCORE_WEIGHTS = {
	distinctCounterparts: 3,
	distinctEndorsers: 2,
	corroboratedGigs: 1.5,
	verifiedReleases: 1.5,
	confirmedCollabs: 1,
	bands: 0.5
} as const satisfies Partial<Record<keyof ReputationFacts, number>>;

export const RESPONSE_SCORE: Readonly<Record<ResponseBucket, number>> = {
	FAST: 1,
	DAY: 0.5,
	SLOW: -0.5
};

/** Score interne, pour le tri de la recherche seulement (arrondi au millième). */
export function internalScore(facts: ReputationFacts): number {
	let score = 0;
	for (const [key, weight] of Object.entries(SCORE_WEIGHTS) as [
		keyof typeof SCORE_WEIGHTS,
		number
	][]) {
		score += weight * Math.log1p(Math.max(0, facts[key]));
	}
	if (facts.responseBucket) score += RESPONSE_SCORE[facts.responseBucket];
	return Math.round(score * 1000) / 1000;
}

/** Carte publique : les faits, sans le score. */
export type PublicReputation = ReputationFacts;

/** Ce qui peut sortir du serveur : tout sauf le score interne. */
export function publicReputation(
	r: ReputationFacts & { internalScore?: number }
): PublicReputation {
	return {
		confirmedCollabs: r.confirmedCollabs,
		distinctCounterparts: r.distinctCounterparts,
		corroboratedGigs: r.corroboratedGigs,
		verifiedReleases: r.verifiedReleases,
		bands: r.bands,
		distinctEndorsers: r.distinctEndorsers,
		endorsementsByKind: r.endorsementsByKind,
		responseBucket: r.responseBucket
	};
}

export const EMPTY_REPUTATION: PublicReputation = {
	confirmedCollabs: 0,
	distinctCounterparts: 0,
	corroboratedGigs: 0,
	verifiedReleases: 0,
	bands: 0,
	distinctEndorsers: 0,
	endorsementsByKind: [],
	responseBucket: null
};
