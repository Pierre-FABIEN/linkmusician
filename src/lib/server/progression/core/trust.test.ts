import { describe, expect, it } from 'vitest';
import {
	canAddWithinStock,
	isTrustLevel,
	nextTrustRequirements,
	quotaLimit,
	TRUST_PERMISSIONS,
	type TrustSummary
} from './trust';

const newcomer: TrustSummary = {
	emailVerified: true,
	accountAgeDays: 2,
	profileComplete: true,
	reciprocalConversations: 0,
	activeSanctions: 0,
	collaborationsWithTrusted: 0,
	distinctCounterparts: 0,
	reportRate: 0
};

describe('table des quotas (§7)', () => {
	it.each([
		[0, 'dailyFirstMessages', 10],
		[1, 'dailyFirstMessages', 30],
		[0, 'activeOpportunities', 1],
		[1, 'activeOpportunities', 3],
		[0, 'mediaItems', 3],
		[1, 'mediaItems', 3],
		[2, 'mediaItems', 10]
	] as const)('TL%i, %s → %i', (level, quota, limit) => {
		expect(quotaLimit(level, quota)).toBe(limit);
	});

	it('les quotas ne baissent jamais quand le palier monte', () => {
		for (const quota of ['dailyFirstMessages', 'activeOpportunities', 'mediaItems'] as const) {
			const limits = ([0, 1, 2, 3] as const).map((l) => quotaLimit(l, quota));
			expect([...limits].sort((a, b) => a - b)).toEqual(limits);
		}
	});

	it('les droits ne se perdent jamais en montant', () => {
		for (const right of ['canEndorse', 'canCorroborate'] as const) {
			const values = ([0, 1, 2, 3] as const).map((l) => TRUST_PERMISSIONS[l][right]);
			expect(values.indexOf(true) === -1 || values.slice(values.indexOf(true)).every(Boolean)).toBe(
				true
			);
		}
	});

	it.each([
		[0, 2, true],
		[0, 3, false],
		[2, 9, true],
		[2, 10, false]
	] as const)('médias : TL%i avec %i déjà publiés → ajout %s', (level, current, allowed) => {
		expect(canAddWithinStock(level, 'mediaItems', current)).toBe(allowed);
	});
});

describe('conditions du palier suivant', () => {
	it('liste ce qui manque pour TL1', () => {
		const { next, requirements } = nextTrustRequirements(newcomer);
		expect(next).toBe(1);
		expect(requirements.filter((r) => !r.met).map((r) => r.label)).toEqual([
			'7 jours d’ancienneté',
			'Un premier échange réciproque'
		]);
	});

	it.each([
		[{ accountAgeDays: 10, reciprocalConversations: 1 }, 2],
		[{ accountAgeDays: 40, reciprocalConversations: 1, collaborationsWithTrusted: 1 }, 3],
		[
			{
				accountAgeDays: 100,
				reciprocalConversations: 1,
				collaborationsWithTrusted: 2,
				distinctCounterparts: 6
			},
			null
		]
	] as const)('palier suivant attendu', (patch, next) => {
		const result = nextTrustRequirements({ ...newcomer, ...patch });
		expect(result.next).toBe(next);
		if (next === null) expect(result.requirements).toEqual([]);
	});

	it('reconnaît un palier valide', () => {
		expect([0, 1, 2, 3].every(isTrustLevel)).toBe(true);
		expect([4, -1, '1', null].some(isTrustLevel)).toBe(false);
	});
});
