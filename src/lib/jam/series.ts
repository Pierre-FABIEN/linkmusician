/**
 * Scènes ouvertes récurrentes (P5-04a, conception 08 §14) : règles pures,
 * partagées par le serveur et le navigateur. Un lieu publie une jam chaque
 * semaine, le même jour et aux mêmes heures (heure de Paris) ; les jams des
 * `SERIES_WEEKS_AHEAD` semaines à venir existent toujours, créées par un job
 * quotidien. Une jam de série est une jam comme les autres.
 */
import { z } from 'zod';
import { parisDay } from '#lib/metrics/indicators';
import { jamSchema, jamWindow, MAX_JAM_HOURS } from './publicJam';

/** Semaines de jams créées à l'avance. */
export const SERIES_WEEKS_AHEAD = 4;
/** Scènes ouvertes actives par lieu. */
export const MAX_SERIES_PER_VENUE = 3;

export const SERIES_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const PLURAL: Readonly<Record<number, string>> = {
	1: 'lundis',
	2: 'mardis',
	3: 'mercredis',
	4: 'jeudis',
	5: 'vendredis',
	6: 'samedis',
	7: 'dimanches'
};
const SINGULAR: Readonly<Record<number, string>> = {
	1: 'lundi',
	2: 'mardi',
	3: 'mercredi',
	4: 'jeudi',
	5: 'vendredi',
	6: 'samedi',
	7: 'dimanche'
};

/** « Tous les jeudis ». */
export const seriesLabel = (weekday: number) => `Tous les ${PLURAL[weekday] ?? ''}`.trim();

/** Titre proposé : « Scène ouverte du jeudi ». */
export const defaultSeriesTitle = (weekday: number) => `Scène ouverte du ${SINGULAR[weekday]}`;

export const seriesSchema = jamSchema
	.pick({ start: true, end: true, title: true, description: true, genre: true, spots: true })
	.extend({
		weekday: z.coerce.number().int().min(1, 'Choisis le jour.').max(7, 'Choisis le jour.')
	});
export type SeriesForm = z.infer<typeof seriesSchema>;

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Durée d'une soirée de la série, en minutes (une fin plus tôt tombe le lendemain). */
export function seriesDuration(start: string, end: string) {
	const d = toMinutes(end) - toMinutes(start);
	return d <= 0 ? d + 24 * 60 : d;
}

/** Le créneau est valable : 8 heures au plus. */
export function checkSeriesWindow(form: Pick<SeriesForm, 'start' | 'end'>): string | null {
	if (seriesDuration(form.start, form.end) > MAX_JAM_HOURS * 60) {
		return `Une jam dure ${MAX_JAM_HOURS} heures au plus.`;
	}
	return null;
}

/** Jour ISO (1 = lundi … 7 = dimanche) d'une date « AAAA-MM-JJ ». */
export const isoWeekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay() || 7;

const addDays = (day: string, n: number) => {
	const d = new Date(`${day}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
};

/**
 * Les soirées de la série dans les `weeks` semaines à venir, à partir
 * d'aujourd'hui (heure de Paris), sans celles déjà commencées.
 */
export function upcomingSeriesWindows(
	series: { weekday: number; startTime: string; endTime: string },
	now = new Date(),
	weeks = SERIES_WEEKS_AHEAD
): { startsAt: Date; endsAt: Date }[] {
	const today = parisDay(now);
	const out: { startsAt: Date; endsAt: Date }[] = [];
	for (let i = 0; i < weeks * 7; i++) {
		const day = addDays(today, i);
		if (isoWeekday(day) !== series.weekday) continue;
		const window = jamWindow(day, series.startTime, series.endTime);
		if (window.startsAt.getTime() > now.getTime()) out.push(window);
	}
	return out;
}
