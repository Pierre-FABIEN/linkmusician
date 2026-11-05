/**
 * Visibilité d'un profil public (P1-11, D19). Règles pures ; le filtre en base
 * est dans `#lib/server/actors/visibility`.
 *
 * Un profil visible n'est pas forcément **indexé** : les moteurs de recherche
 * ne reçoivent que les profils de personnes majeures (D5 : 16 ans minimum à
 * l'inscription, protection renforcée des 16-17 ans).
 */

export const INDEXING_MIN_AGE = 18;

/** Date de naissance la plus récente d'une personne majeure à `now` (minuit UTC). */
export function adultBirthCutoff(now: Date = new Date()): Date {
	return new Date(
		Date.UTC(now.getUTCFullYear() - INDEXING_MIN_AGE, now.getUTCMonth(), now.getUTCDate())
	);
}

/**
 * Le profil peut-il être indexé ? Une date inconnue (structure, compte
 * anonymisé) vaut refus : dans le doute, on n'indexe pas.
 */
export function isIndexable(birthDate: Date | null | undefined, now: Date = new Date()): boolean {
	return birthDate != null && birthDate.getTime() <= adultBirthCutoff(now).getTime();
}
