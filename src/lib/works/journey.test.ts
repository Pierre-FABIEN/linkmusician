import { describe, expect, it } from 'vitest';
import { campaignDays, campaignDone } from './journey';

describe('récap de campagne (P4-10)', () => {
	it('bouclée quand le morceau est masterisé ou produit', () => {
		expect(campaignDone({ masteredAt: null, producedAt: null })).toBe(false);
		expect(campaignDone({ masteredAt: new Date(), producedAt: null })).toBe(true);
		expect(campaignDone({ masteredAt: null, producedAt: new Date() })).toBe(true);
	});

	it('compte les jours de la campagne, au moins un', () => {
		const start = new Date('2026-09-01T10:00:00Z');
		expect(campaignDays(start, new Date('2026-09-01T18:00:00Z'))).toBe(1);
		expect(campaignDays(start, new Date('2026-10-01T10:00:00Z'))).toBe(30);
	});
});
