/**
 * Jams publiques (P2-14b, D26, D27) : règles pures, partagées par le serveur
 * et le navigateur. Une jam se tient dans un lieu de l'annuaire, à un créneau
 * précis (heure de Paris), avec des places souhaitées par instrument. On dit
 * « Je viens » sans attendre d'acceptation.
 */
import { z } from 'zod';
import { parisDay } from '#lib/metrics/indicators';
import { parisToUtc } from './availability';

export const MAX_JAM_HOURS = 8;
export const MAX_DAYS_AHEAD = 60;
export const MAX_SPOT_INSTRUMENTS = 6;
export const MAX_SPOTS_PER_INSTRUMENT = 5;
/** Les mineur·es ne voient que les jams finies à cette heure (D5). */
export const MINOR_CURFEW = { hh: 22, mm: 0 };

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure au format HH:MM.');
const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Heure « murale » à Paris d'un instant, en minutes depuis minuit. */
export function parisMinutes(at: Date): number {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Europe/Paris',
		hourCycle: 'h23',
		hour: '2-digit',
		minute: '2-digit'
	}).formatToParts(at);
	const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
	return get('hour') * 60 + get('minute');
}

/**
 * Début et fin d'une jam. Une fin plus tôt que le début tombe le lendemain
 * (une jam de 21 h à 1 h).
 */
export function jamWindow(day: string, start: string, end: string) {
	const startsAt = parisToUtc(day, Number(start.slice(0, 2)), Number(start.slice(3, 5)));
	let endsAt = parisToUtc(day, Number(end.slice(0, 2)), Number(end.slice(3, 5)));
	if (toMinutes(end) <= toMinutes(start)) {
		const next = new Date(`${day}T12:00:00Z`);
		next.setUTCDate(next.getUTCDate() + 1);
		endsAt = parisToUtc(
			next.toISOString().slice(0, 10),
			Number(end.slice(0, 2)),
			Number(end.slice(3, 5))
		);
	}
	return { startsAt, endsAt };
}

/** La jam finit le jour même, avant 22 h (heure de Paris) : visible des mineur·es. */
export function endsBeforeCurfew(startsAt: Date, endsAt: Date): boolean {
	return (
		parisDay(startsAt) === parisDay(endsAt) &&
		parisMinutes(endsAt) <= MINOR_CURFEW.hh * 60 + MINOR_CURFEW.mm
	);
}

const spot = z.object({
	instrument: z.string().regex(/^[a-z0-9-]{1,60}$/),
	count: z.coerce.number().int().min(1).max(MAX_SPOTS_PER_INSTRUMENT)
});

export const jamSchema = z.object({
	venueId: z.string().regex(/^[a-z0-9]{20,40}$/, 'Choisis le lieu de la jam.'),
	day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choisis le jour.'),
	start: time,
	end: time,
	title: z.string().trim().min(5, 'Un titre de 5 caractères au moins.').max(80),
	description: z.string().trim().max(1000).default(''),
	genre: z
		.string()
		.regex(/^[a-z0-9-]{1,60}$/)
		.optional()
		.or(z.literal('').transform(() => undefined)),
	spots: z
		.array(spot)
		.max(MAX_SPOT_INSTRUMENTS, `${MAX_SPOT_INSTRUMENTS} instruments au plus.`)
		.default([])
		.refine(
			(list) => new Set(list.map((s) => s.instrument)).size === list.length,
			'Un instrument n’apparaît qu’une fois.'
		)
});
export type JamForm = z.infer<typeof jamSchema>;

/** Vérifie le créneau d'une jam ; renvoie un message d'erreur ou la fenêtre. */
export function checkJamWindow(
	form: Pick<JamForm, 'day' | 'start' | 'end'>,
	now = new Date()
): { ok: true; startsAt: Date; endsAt: Date } | { ok: false; error: string } {
	const { startsAt, endsAt } = jamWindow(form.day, form.start, form.end);
	if (Number.isNaN(startsAt.getTime())) return { ok: false, error: 'Jour invalide.' };
	if (startsAt.getTime() <= now.getTime()) return { ok: false, error: 'Le début est déjà passé.' };
	if (startsAt.getTime() - now.getTime() > MAX_DAYS_AHEAD * 86_400_000) {
		return { ok: false, error: `Une jam se publie ${MAX_DAYS_AHEAD} jours à l’avance au plus.` };
	}
	if (endsAt.getTime() - startsAt.getTime() > MAX_JAM_HOURS * 3_600_000) {
		return { ok: false, error: `Une jam dure ${MAX_JAM_HOURS} heures au plus.` };
	}
	return { ok: true, startsAt, endsAt };
}
