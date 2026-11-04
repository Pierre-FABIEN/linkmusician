/**
 * Distances affichées (P1-05) : toujours par tranches, jamais en mètres. Une
 * distance précise permettrait, par recoupements, de trianguler une personne.
 *
 * Module pur.
 */

export const DISTANCE_BANDS = [
	{ maxKm: 5, label: 'moins de 5 km' },
	{ maxKm: 10, label: '5 à 10 km' },
	{ maxKm: 25, label: '10 à 25 km' },
	{ maxKm: 50, label: '25 à 50 km' },
	{ maxKm: 100, label: '50 à 100 km' }
] as const;

export const FAR_LABEL = 'plus de 100 km';

/** Tranche affichée pour une distance en mètres. */
export function distanceBand(meters: number): string {
	const km = meters / 1000;
	return DISTANCE_BANDS.find((band) => km < band.maxKm)?.label ?? FAR_LABEL;
}
