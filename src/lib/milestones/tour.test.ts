import { describe, expect, it } from 'vitest';
import { firstTour } from './tour';

describe('tournée : 3 concerts vérifiés, 3 communes, 30 jours (P5-06)', () => {
	it('trois villes en trois semaines : une tournée', () => {
		expect(
			firstTour([
				{ day: '2026-11-21', communeCode: '33063' },
				{ day: '2026-11-07', communeCode: '31555' },
				{ day: '2026-11-14', communeCode: '34172' }
			])
		).toEqual({ from: '2026-11-07', to: '2026-11-21' });
	});

	it('trois concerts dans deux villes ne font pas une tournée', () => {
		expect(
			firstTour([
				{ day: '2026-11-07', communeCode: '31555' },
				{ day: '2026-11-08', communeCode: '31555' },
				{ day: '2026-11-09', communeCode: '34172' }
			])
		).toBeNull();
	});

	it('au-delà de 30 jours, la fenêtre ne tient pas ; une fenêtre plus tardive peut', () => {
		const spread = [
			{ day: '2026-10-01', communeCode: '31555' },
			{ day: '2026-10-20', communeCode: '34172' },
			{ day: '2026-10-31', communeCode: '33063' }
		];
		expect(firstTour(spread)).toBeNull();
		expect(firstTour([...spread, { day: '2026-11-05', communeCode: '13055' }])).toEqual({
			from: '2026-10-20',
			to: '2026-11-05'
		});
	});
});
