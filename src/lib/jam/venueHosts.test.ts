import { describe, expect, it } from 'vitest';
import { compareLeadCandidates, leadSuggestionFacts } from './venueHosts';

describe('suggestions de leads (P5-04b)', () => {
	it('trie par appréciations, puis jams animées, puis distance', () => {
		const rows = [
			{ id: 'proche', endorsers: 0, jamsLed: 0, meters: 1_000 },
			{ id: 'animatrice', endorsers: 2, jamsLed: 3, meters: 20_000 },
			{ id: 'appreciee', endorsers: 5, jamsLed: 0, meters: 25_000 },
			{ id: 'animatrice-proche', endorsers: 2, jamsLed: 3, meters: 5_000 }
		];
		expect(rows.sort(compareLeadCandidates).map((r) => r.id)).toEqual([
			'appreciee',
			'animatrice-proche',
			'animatrice',
			'proche'
		]);
	});

	it('dit pourquoi la personne est suggérée', () => {
		expect(leadSuggestionFacts({ endorsers: 4, jamsLed: 1 })).toBe(
			'Appréciations de 4 personnes · 1 jam animée'
		);
		expect(leadSuggestionFacts({ endorsers: 1, jamsLed: 0 })).toBe('Appréciation d’une personne');
		expect(leadSuggestionFacts({ endorsers: 0, jamsLed: 0 })).toBe('Prêt·e à organiser des jams');
	});
});
