/**
 * Tournée (P5-06, conception 02 §4) : l'étape « Première tournée » est
 * vérifiée par **au moins 3 concerts vérifiés dans au moins 3 communes
 * différentes en 30 jours**. Calcul pur, sur les jours (AAAA-MM-JJ) et les
 * codes INSEE des concerts.
 */
export const TOUR_MIN_GIGS = 3;
export const TOUR_MIN_COMMUNES = 3;
export const TOUR_WINDOW_DAYS = 30;

export type TourGig = { day: string; communeCode: string };

const DAY = 86_400_000;
const time = (day: string) => new Date(`${day}T12:00:00Z`).getTime();

/**
 * La première fenêtre de 30 jours qui fait une tournée, ou `null`. La
 * fenêtre s'ouvre au premier concert et compte les jours inclus
 * (du 1er au 30).
 */
export function firstTour(gigs: readonly TourGig[]): { from: string; to: string } | null {
	const sorted = [...gigs].sort((a, b) => a.day.localeCompare(b.day));
	for (let i = 0; i < sorted.length; i++) {
		const start = time(sorted[i].day);
		const inWindow = sorted.filter(
			(g) => time(g.day) >= start && time(g.day) - start < TOUR_WINDOW_DAYS * DAY
		);
		const communes = new Set(inWindow.map((g) => g.communeCode));
		if (inWindow.length >= TOUR_MIN_GIGS && communes.size >= TOUR_MIN_COMMUNES) {
			return { from: sorted[i].day, to: inWindow[inWindow.length - 1].day };
		}
	}
	return null;
}
