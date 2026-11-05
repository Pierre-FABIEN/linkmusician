/**
 * Mode jam, « Je suis dispo » (P2-13) : créneaux calculés à l'heure de
 * Paris, note facultative. Module pur, partagé par le serveur et le
 * navigateur.
 */
import { parisDay } from '#lib/metrics/indicators';

export const AVAILABILITY_SLOTS = ['TONIGHT', 'TOMORROW', 'WEEKEND'] as const;
export type AvailabilitySlotValue = (typeof AVAILABILITY_SLOTS)[number];

export const SLOT_LABELS: Readonly<Record<AvailabilitySlotValue, string>> = {
	TONIGHT: 'Ce soir',
	TOMORROW: 'Demain',
	WEEKEND: 'Ce week-end'
};

export const MAX_NOTE = 140;

/** Instant UTC d'une heure « murale » à Paris (heure d'été comprise). */
export function parisToUtc(day: string, hh: number, mm: number, ss = 0): Date {
	const [y, m, d] = day.split('-').map(Number);
	const guess = Date.UTC(y, m - 1, d, hh, mm, ss);
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Europe/Paris',
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).formatToParts(new Date(guess));
	const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
	const wall = Date.UTC(
		get('year'),
		get('month') - 1,
		get('day'),
		get('hour'),
		get('minute'),
		get('second')
	);
	return new Date(guess - (wall - guess));
}

const shift = (day: string, days: number) => {
	const d = new Date(`${day}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
};
/** Jour de la semaine (0 = dimanche) d'un jour civil. */
const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

/** Fenêtre d'un créneau, à partir de maintenant. */
export function slotWindow(slot: AvailabilitySlotValue, now = new Date()) {
	const today = parisDay(now);
	const endOf = (day: string) => parisToUtc(day, 23, 59, 59);
	switch (slot) {
		case 'TONIGHT':
			return { startsAt: now, endsAt: endOf(today) };
		case 'TOMORROW': {
			const tomorrow = shift(today, 1);
			return { startsAt: parisToUtc(tomorrow, 0, 0), endsAt: endOf(tomorrow) };
		}
		case 'WEEKEND': {
			const wd = weekday(today);
			if (wd === 6 || wd === 0) {
				// Déjà le week-end : jusqu'à dimanche soir.
				return { startsAt: now, endsAt: endOf(wd === 6 ? shift(today, 1) : today) };
			}
			const saturday = shift(today, 6 - wd);
			return { startsAt: parisToUtc(saturday, 0, 0), endsAt: endOf(shift(saturday, 1)) };
		}
	}
}

/** Note facultative : texte brut d'une ligne, `null` si vide. */
export function cleanNote(raw: string | null | undefined): string | null {
	const note = (raw ?? '')
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u001f\u007f]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return note === '' ? null : [...note].slice(0, MAX_NOTE).join('');
}
