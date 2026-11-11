import { describe, expect, it } from 'vitest';
import {
	checkSeriesWindow,
	defaultSeriesTitle,
	isoWeekday,
	seriesLabel,
	seriesSchema,
	upcomingSeriesWindows
} from './series';

const thursday = { weekday: 4, startTime: '20:00', endTime: '23:00' };

describe('scènes ouvertes récurrentes', () => {
	it('nomme la série', () => {
		expect(seriesLabel(4)).toBe('Tous les jeudis');
		expect(defaultSeriesTitle(7)).toBe('Scène ouverte du dimanche');
	});

	it('connaît le jour de la semaine', () => {
		expect(isoWeekday('2026-11-12')).toBe(4);
		expect(isoWeekday('2026-11-15')).toBe(7);
	});

	it('crée les jeudis des 4 semaines à venir, heure de Paris', () => {
		// Mercredi 11 novembre 2026, midi à Paris.
		const now = new Date('2026-11-11T11:00:00Z');
		const windows = upcomingSeriesWindows(thursday, now);
		expect(windows.map((w) => w.startsAt.toISOString())).toEqual([
			'2026-11-12T19:00:00.000Z',
			'2026-11-19T19:00:00.000Z',
			'2026-11-26T19:00:00.000Z',
			'2026-12-03T19:00:00.000Z'
		]);
		expect(windows[0].endsAt.toISOString()).toBe('2026-11-12T22:00:00.000Z');
	});

	it('ne recrée pas la soirée déjà commencée', () => {
		const now = new Date('2026-11-12T19:30:00Z');
		const windows = upcomingSeriesWindows(thursday, now);
		expect(windows[0].startsAt.toISOString()).toBe('2026-11-19T19:00:00.000Z');
		expect(windows).toHaveLength(3);
	});

	it('suit le passage à l’heure d’été', () => {
		const now = new Date('2027-03-20T12:00:00Z');
		const [first, second] = upcomingSeriesWindows(thursday, now);
		expect(first.startsAt.toISOString()).toBe('2027-03-25T19:00:00.000Z');
		expect(second.startsAt.toISOString()).toBe('2027-04-01T18:00:00.000Z');
	});

	it('accepte une fin après minuit, refuse plus de 8 heures', () => {
		expect(checkSeriesWindow({ start: '21:00', end: '01:00' })).toBeNull();
		expect(checkSeriesWindow({ start: '14:00', end: '23:00' })).toMatch(/8 heures/);
	});

	it('valide le formulaire', () => {
		const ok = seriesSchema.safeParse({
			weekday: '4',
			start: '20:00',
			end: '23:00',
			title: 'Scène ouverte du jeudi',
			spots: [{ instrument: 'batterie', count: '1' }]
		});
		expect(ok.success).toBe(true);
		expect(seriesSchema.safeParse({ ...thursday, weekday: 0, title: 'Scène' }).success).toBe(false);
	});
});
