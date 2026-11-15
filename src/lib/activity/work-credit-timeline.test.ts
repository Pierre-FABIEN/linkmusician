import { describe, expect, it } from 'vitest';
import { workCreditTimeline } from './work-credit-timeline';

describe('actes humains de crédits', () => {
	it('ne confond pas attribution de gestion, consentement et retrait', () => {
		const at = new Date('2026-11-15T12:00:00Z');
		const entries = workCreditTimeline([
			{ id: 'b', kind: 'CONFIRMED', author: 'Inès', concernsMe: true, occurredAt: at },
			{ id: 'a', kind: 'ASSIGNED', author: 'Clara', concernsMe: true, occurredAt: at },
			{ id: 'c', kind: 'WITHDRAWN', author: 'Clara', concernsMe: false, occurredAt: at }
		]);
		expect(entries.map((e) => e.id)).toEqual(['a', 'b', 'c']);
		expect(entries.map((e) => e.action)).toEqual([
			'Crédit attribué par la gestion, en attente de consentement',
			'Crédit confirmé personnellement',
			'Crédit en attente retiré par la gestion (pour autrui)'
		]);
		expect(entries[0].author).toBe('Clara');
		expect(workCreditTimeline([])).toEqual([]);
	});
});
