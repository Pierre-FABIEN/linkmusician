import { describe, expect, it } from 'vitest';
import { BAND_TIER_LABELS } from '#lib/server/progression/core/tiers';
import {
	GIG_TIER_LABELS,
	GIG_TIER_OPTIONS,
	checkGigDate,
	gigSlotSchema,
	reachesTier,
	unmetGigConditions
} from './gigSlot';

const near = { tier: 'FIRST_GIG' as const, genreSlugs: ['rock', 'punk'], distanceKm: 12 };
const open = { minBandTier: null, genre: null, radiusKm: 50 };

describe('plateaux : éligibilité des groupes (P5-05a)', () => {
	it('un groupe qui remplit les conditions peut candidater', () => {
		expect(
			unmetGigConditions({ minBandTier: 'FIRST_GIG', genre: 'rock', radiusKm: 25 }, near)
		).toEqual([]);
	});

	it('un groupe hors conditions ne peut pas candidater : rang, genre, zone', () => {
		const young = { tier: 'FIRST_REHEARSAL' as const, genreSlugs: ['jazz'], distanceKm: 80 };
		expect(
			unmetGigConditions({ minBandTier: 'FIRST_GIG', genre: 'rock', radiusKm: 25 }, young)
		).toEqual(['tier', 'genre', 'zone']);
	});

	it('un groupe sans étape prouvée ne passe pas un rang demandé, mais passe un plateau ouvert', () => {
		const fresh = { tier: null, genreSlugs: [], distanceKm: 3 };
		expect(unmetGigConditions({ ...open, minBandTier: 'FIRST_REHEARSAL' }, fresh)).toEqual([
			'tier'
		]);
		expect(unmetGigConditions(open, fresh)).toEqual([]);
	});

	it('un groupe sans ville est hors zone', () => {
		expect(unmetGigConditions(open, { ...near, distanceKm: null })).toEqual(['zone']);
	});

	it('le rang suit l’ordre des étapes, jamais l’XP', () => {
		expect(reachesTier('FIRST_TOUR', 'FIRST_GIG')).toBe(true);
		expect(reachesTier('FIRST_GIG', 'FIRST_GIG')).toBe(true);
		expect(reachesTier('FIRST_PUBLIC_DEMO', 'FIRST_GIG')).toBe(false);
		expect(reachesTier(null, null)).toBe(true);
	});

	it('les libellés de rang restent alignés sur le noyau de progression', () => {
		expect(GIG_TIER_LABELS).toEqual(BAND_TIER_LABELS);
		expect(GIG_TIER_OPTIONS.map((t) => t.label)).toContain('Live');
	});
});

describe('plateaux : formulaire et date', () => {
	const now = new Date('2026-11-11T10:00:00Z');

	it('lit l’heure de Paris', () => {
		const r = checkGigDate({ day: '2026-11-20', start: '20:30' }, now);
		expect(r.ok && r.startsAt.toISOString()).toBe('2026-11-20T19:30:00.000Z');
	});

	it('refuse une date passée ou à plus d’un an', () => {
		expect(checkGigDate({ day: '2026-11-10', start: '20:30' }, now).ok).toBe(false);
		expect(checkGigDate({ day: '2028-01-01', start: '20:30' }, now).ok).toBe(false);
	});

	it('n’accepte qu’une étape connue comme rang, et aucun champ d’XP', () => {
		const base = {
			venueId: 'c'.repeat(25),
			day: '2026-11-20',
			start: '20:30',
			title: 'Plateau rock',
			description: 'Trois groupes, sets de quarante minutes, chapeau.',
			slots: '3',
			radiusKm: '50'
		};
		expect(gigSlotSchema.safeParse({ ...base, minBandTier: 'FIRST_GIG' }).success).toBe(true);
		expect(gigSlotSchema.safeParse({ ...base, minBandTier: 'LEVEL_5' }).success).toBe(false);
		const parsed = gigSlotSchema.parse({ ...base, minXp: '500' });
		expect(parsed).not.toHaveProperty('minXp');
	});
});
