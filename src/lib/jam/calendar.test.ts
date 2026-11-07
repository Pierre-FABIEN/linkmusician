import { describe, expect, it } from 'vitest';
import { parisDayKey } from './calendar';

describe('parisDayKey', () => {
	it('regroupe les jams selon le jour civil de Paris, y compris au changement de jour', () => {
		expect(parisDayKey(new Date('2026-11-07T22:30:00.000Z'))).toBe('2026-11-07');
		expect(parisDayKey(new Date('2026-11-07T23:30:00.000Z'))).toBe('2026-11-08');
	});

	it('respecte le passage à l’heure d’été', () => {
		expect(parisDayKey(new Date('2026-03-28T22:30:00.000Z'))).toBe('2026-03-28');
		expect(parisDayKey(new Date('2026-03-28T23:30:00.000Z'))).toBe('2026-03-29');
	});
});
