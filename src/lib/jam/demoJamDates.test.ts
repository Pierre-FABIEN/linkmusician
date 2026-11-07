import { describe, expect, it } from 'vitest';
import { demoJamStartsThisMonth } from './demoJamDates';

describe('demoJamStartsThisMonth', () => {
	it('répartit jusqu’à douze jams sur les jours restants du mois à Paris', () => {
		const starts = demoJamStartsThisMonth(new Date('2026-11-07T19:30:00.000Z'));

		expect(starts).toHaveLength(12);
		expect(starts[0]?.toISOString()).toBe('2026-11-08T15:00:00.000Z');
		expect(starts.at(-1)?.toISOString()).toBe('2026-11-30T16:00:00.000Z');
		expect(starts.every((date) => date.getUTCMonth() === 10)).toBe(true);
	});

	it('ne programme pas de jam dans un mois déjà terminé', () => {
		expect(demoJamStartsThisMonth(new Date('2026-11-30T22:30:00.000Z'))).toEqual([]);
	});

	it('respecte le mois civil de Paris près du changement de mois', () => {
		const starts = demoJamStartsThisMonth(new Date('2026-11-30T23:30:00.000Z'));

		expect(starts).toHaveLength(12);
		expect(starts[0]?.toISOString()).toBe('2026-12-02T15:00:00.000Z');
	});
});
