import { describe, expect, it } from 'vitest';
import { MILESTONE_CATALOG, MILESTONE_KEYS, MILESTONE_PROOFS } from './rules';
import { milestoneDefinitions } from '../../../prisma/seed-data/milestones.js';
import { MILESTONES, PROOF_STATUSES } from '#lib/server/progression/core/events';
import { BAREME } from '#lib/server/progression/core/bareme';

describe('référentiel des étapes (prisma/seed-data/milestones.js)', () => {
	it('reprend le catalogue de l’app à l’identique', () => {
		expect(milestoneDefinitions).toEqual(
			MILESTONE_CATALOG.map((d) => [d.key, d.ordinal, d.label, d.mode])
		);
	});

	it('parle la langue du moteur', () => {
		expect([...MILESTONE_KEYS]).toEqual([...MILESTONES]);
		expect([...MILESTONE_PROOFS]).toEqual([...PROOF_STATUSES]);
	});

	it('une étape déclarable rapporte quelque chose une fois déclarée', () => {
		for (const d of MILESTONE_CATALOG.filter((x) => x.mode === 'declare')) {
			expect(BAREME.milestones[d.key].DECLARED).toBeGreaterThan(0);
		}
		// Formation et composition arrivent avec leur propre niveau de preuve.
		expect(BAREME.milestones.FORMATION.VERIFIED).toBeGreaterThan(0);
		expect(BAREME.milestones.FIRST_COMPOSITION.DECLARED).toBeGreaterThan(0);
	});
});
