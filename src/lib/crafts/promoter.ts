/**
 * Profil d'organisateur·rice (P5-05a, conception 06 §3.6 et 08 §8) :
 * référentiel et règles. Module pur, partagé par le serveur et le navigateur.
 *
 * Tout est déclaratif. Les événements **tenus** (confirmés par les groupes)
 * viendront avec les concerts vérifiés (P5-06) : ce sont eux qui font le
 * rang, jamais la fiche.
 */

/** Ce que la personne organise, dans l'ordre d'affichage. Alignés sur l'enum Prisma `PromoterEventKind`. */
export const PROMOTER_EVENT_KINDS = [
	'CONCERTS',
	'CLUB_NIGHTS',
	'FESTIVAL',
	'TOURS',
	'OPEN_STAGES'
] as const;
export type PromoterEventKindValue = (typeof PROMOTER_EVENT_KINDS)[number];

export const PROMOTER_EVENT_KIND_INFO: Readonly<
	Record<PromoterEventKindValue, { label: string; hint: string }>
> = {
	CONCERTS: {
		label: 'Concerts',
		hint: 'Des plateaux de groupes dans une salle, un bar, un tiers-lieu.'
	},
	CLUB_NIGHTS: { label: 'Soirées', hint: 'Des soirées régulières, avec une ligne artistique.' },
	FESTIVAL: { label: 'Festival', hint: 'Un ou plusieurs jours, plusieurs scènes ou plateaux.' },
	TOURS: { label: 'Tournées', hint: 'Des dates enchaînées dans plusieurs villes.' },
	OPEN_STAGES: { label: 'Scènes ouvertes', hint: 'Des bœufs et des jams publiques.' }
};

/** Genres programmés : du référentiel, 5 au plus. */
export const MAX_PROMOTER_GENRES = 5;
/** Jauge habituelle : de 1 à 100 000 personnes. */
export const MAX_CAPACITY = 100_000;

/** Ce qu'il faut pour apparaître dans la recherche par métier : un type d'événement. */
export function isPromoterProfileListed(profile: { eventKinds: readonly unknown[] }): boolean {
	return profile.eventKinds.length > 0;
}

/** Jauge en mots (« 120 personnes »). */
export function capacityLabel(capacity: number | null): string | null {
	if (!capacity) return null;
	return `${capacity.toLocaleString('fr-FR')} personne${capacity > 1 ? 's' : ''}`;
}
