import { describe, expect, it } from 'vitest';
import { logStats, plural } from './log';

describe('carnet de jams (P2-16)', () => {
	it('personnes, instruments, styles et communes distincts', () => {
		expect(
			logStats([
				{
					jamId: 'a',
					communeName: 'Toulouse',
					genre: 'funk',
					others: [
						{ handle: 'malik', instrument: 'Batterie' },
						{ handle: 'lea', instrument: 'Basse' }
					]
				},
				{
					jamId: 'b',
					communeName: 'Blagnac',
					genre: null,
					others: [
						{ handle: 'malik', instrument: 'Batterie' },
						{ handle: 'sam', instrument: null }
					]
				}
			])
		).toEqual({ jams: 2, people: 3, instruments: 2, styles: 1, communes: 2 });
		expect(logStats([])).toEqual({ jams: 0, people: 0, instruments: 0, styles: 0, communes: 0 });
	});

	it('pluriels', () => {
		expect(plural(1, 'jam')).toBe('1 jam');
		expect(plural(3, 'personne rencontrée', 'personnes rencontrées')).toBe(
			'3 personnes rencontrées'
		);
	});
});
