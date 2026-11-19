/**
 * Étapes de scène personnelles (P8, D77) : règles pures. Écrit le 19/11/2026,
 * **non exécuté** dans la session.
 *
 *   npm run test:unit -- --run src/lib/milestones/personal.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
	DECLARABLE_KEYS,
	isPersonalMilestoneKey,
	PERSONAL_MILESTONE_KEYS,
	personalGigProof
} from './rules';

describe('étapes de scène personnelles (P8)', () => {
	it('seulement le premier concert et la première tournée', () => {
		expect(PERSONAL_MILESTONE_KEYS).toEqual(['FIRST_GIG', 'FIRST_TOUR']);
		expect(isPersonalMilestoneKey('FIRST_GIG')).toBe(true);
		expect(isPersonalMilestoneKey('FIRST_TOUR')).toBe(true);
		// Les étapes de groupe restent de groupe.
		for (const key of ['FORMATION', 'FIRST_REHEARSAL', 'FIRST_COMPOSITION', 'FIRST_RECORDING'])
			expect(isPersonalMilestoneKey(key)).toBe(false);
	});

	it('vérifiée par une organisation vérifiée, corroborée sinon', () => {
		expect(personalGigProof(null, true)).toBe('VERIFIED');
		expect(personalGigProof(null, false)).toBe('CORROBORATED');
	});

	it('jamais de recul ni de seconde écriture au même niveau', () => {
		expect(personalGigProof('CORROBORATED', false)).toBeNull();
		expect(personalGigProof('VERIFIED', false)).toBeNull();
		expect(personalGigProof('VERIFIED', true)).toBeNull();
		expect(personalGigProof('CORROBORATED', true)).toBe('VERIFIED');
	});

	it('jamais « déclarée » : sans tiers, rien', () => {
		for (const verified of [true, false])
			expect(personalGigProof(null, verified)).not.toBe('DECLARED');
		// La déclaration à la main reste réservée à la gestion d'un groupe.
		expect(DECLARABLE_KEYS).toContain('FIRST_GIG');
	});
});
