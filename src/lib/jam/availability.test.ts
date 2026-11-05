import { describe, expect, it } from 'vitest';
import { cleanNote, parisToUtc, slotWindow } from './availability';

const iso = (d: Date) => d.toISOString();

describe('heure de Paris', () => {
	it('hiver (UTC+1) et été (UTC+2)', () => {
		expect(iso(parisToUtc('2026-11-05', 23, 59, 59))).toBe('2026-11-05T22:59:59.000Z');
		expect(iso(parisToUtc('2026-07-01', 23, 59, 59))).toBe('2026-07-01T21:59:59.000Z');
	});
});

describe('créneaux « Je suis dispo » (P2-13)', () => {
	// Jeudi 5 novembre 2026, 18 h à Paris.
	const thursday = new Date('2026-11-05T17:00:00Z');

	it('ce soir : jusqu’à minuit, heure de Paris', () => {
		const w = slotWindow('TONIGHT', thursday);
		expect(w.startsAt).toEqual(thursday);
		expect(iso(w.endsAt)).toBe('2026-11-05T22:59:59.000Z');
	});

	it('demain : toute la journée de vendredi', () => {
		const w = slotWindow('TOMORROW', thursday);
		expect(iso(w.startsAt)).toBe('2026-11-05T23:00:00.000Z');
		expect(iso(w.endsAt)).toBe('2026-11-06T22:59:59.000Z');
	});

	it('ce week-end, en semaine : samedi et dimanche', () => {
		const w = slotWindow('WEEKEND', thursday);
		expect(iso(w.startsAt)).toBe('2026-11-06T23:00:00.000Z'); // samedi 0 h
		expect(iso(w.endsAt)).toBe('2026-11-08T22:59:59.000Z'); // dimanche 23 h 59
	});

	it('ce week-end, un samedi : dès maintenant', () => {
		const saturday = new Date('2026-11-07T10:00:00Z');
		const w = slotWindow('WEEKEND', saturday);
		expect(w.startsAt).toEqual(saturday);
		expect(iso(w.endsAt)).toBe('2026-11-08T22:59:59.000Z');
	});

	it('ce week-end, un dimanche : jusqu’à ce soir', () => {
		const sunday = new Date('2026-11-08T10:00:00Z');
		expect(iso(slotWindow('WEEKEND', sunday).endsAt)).toBe('2026-11-08T22:59:59.000Z');
	});
});

describe('note', () => {
	it.each([
		['  Envie   d’un bœuf\nfunk ', 'Envie d’un bœuf funk'],
		['', null],
		['   ', null],
		['x'.repeat(200), 'x'.repeat(140)]
	])('%j → %j', (raw, expected) => {
		expect(cleanNote(raw)).toBe(expected);
	});
});
