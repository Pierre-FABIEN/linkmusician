import { describe, expect, it } from 'vitest';
import { checkJamWindow, endsBeforeCurfew, jamSchema, jamWindow, parisMinutes } from './publicJam';

describe('jams publiques (P2-14b)', () => {
	it('créneau à l’heure de Paris, fin après minuit le lendemain', () => {
		const w = jamWindow('2026-11-12', '21:00', '01:00');
		expect(w.startsAt.toISOString()).toBe('2026-11-12T20:00:00.000Z'); // UTC+1 en novembre
		expect(w.endsAt.toISOString()).toBe('2026-11-13T00:00:00.000Z');
		const summer = jamWindow('2027-06-21', '18:00', '21:30');
		expect(summer.startsAt.toISOString()).toBe('2027-06-21T16:00:00.000Z'); // UTC+2
		expect(parisMinutes(summer.endsAt)).toBe(21 * 60 + 30);
	});

	it('mineur·es : seulement les jams finies le jour même avant 22 h', () => {
		const ok = jamWindow('2026-11-12', '18:00', '22:00');
		const late = jamWindow('2026-11-12', '20:00', '22:30');
		const night = jamWindow('2026-11-12', '21:00', '01:00');
		expect(endsBeforeCurfew(ok.startsAt, ok.endsAt)).toBe(true);
		expect(endsBeforeCurfew(late.startsAt, late.endsAt)).toBe(false);
		expect(endsBeforeCurfew(night.startsAt, night.endsAt)).toBe(false);
	});

	it('refuse un créneau passé, trop lointain ou trop long', () => {
		const now = new Date('2026-11-05T12:00:00Z');
		expect(checkJamWindow({ day: '2026-11-05', start: '20:00', end: '23:00' }, now).ok).toBe(true);
		expect(checkJamWindow({ day: '2026-11-04', start: '20:00', end: '23:00' }, now).ok).toBe(false);
		expect(checkJamWindow({ day: '2027-02-01', start: '20:00', end: '23:00' }, now).ok).toBe(false);
		expect(checkJamWindow({ day: '2026-11-06', start: '12:00', end: '23:00' }, now).ok).toBe(false);
	});

	it('places par instrument : une fois chacun', () => {
		const base = {
			venueId: 'clvenue0000000000000001',
			day: '2026-11-12',
			start: '20:00',
			end: '23:00',
			title: 'Bœuf funk du jeudi'
		};
		expect(
			jamSchema.safeParse({ ...base, spots: [{ instrument: 'batterie', count: 1 }] }).success
		).toBe(true);
		expect(
			jamSchema.safeParse({
				...base,
				spots: [
					{ instrument: 'batterie', count: 1 },
					{ instrument: 'batterie', count: 2 }
				]
			}).success
		).toBe(false);
		expect(jamSchema.safeParse({ ...base, venueId: '' }).success).toBe(false);
	});
});
