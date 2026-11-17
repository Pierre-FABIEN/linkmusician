import { describe, expect, it } from 'vitest';
import {
	nextProductionNeed,
	productionStages,
	stageHandled,
	type StepFact,
	type WorkDates
} from './production';

const none: WorkDates = { recordedAt: null, mixedAt: null, masteredAt: null, producedAt: null };
const d1 = new Date('2026-11-01T10:00:00Z');
const d2 = new Date('2026-11-10T10:00:00Z');
const step = (s: Partial<StepFact>): StepFact => ({
	kind: 'RECORDING',
	status: 'TODO',
	assigned: true,
	doneAt: null,
	assignee: 'Thomas',
	...s
});

describe('production d’un morceau (DASH-06c)', () => {
	it('rien de fait ni pris : il faut enregistrer', () => {
		const stages = productionStages(none, []);
		expect(stages.RECORDING).toBeNull();
		expect(nextProductionNeed(stages, [])).toBe('RECORDING');
	});

	it('pris en charge mais pas terminé : plus de besoin, rien de déclaré', () => {
		for (const status of ['TODO', 'IN_PROGRESS'] as const) {
			const steps = [step({ status })];
			const stages = productionStages(none, steps);
			expect(stages.RECORDING).toBeNull();
			expect(stageHandled('RECORDING', stages, steps)).toBe(true);
			expect(nextProductionNeed(stages, steps)).toBeNull();
		}
	});

	it('terminé soi-même : déclaré par Thomas, puis le mixage', () => {
		const steps = [step({ status: 'DONE', doneAt: d2 })];
		const stages = productionStages(none, steps);
		expect(stages.RECORDING).toEqual({ source: 'DECLARED', at: d2, declaredBy: 'Thomas' });
		expect(nextProductionNeed(stages, steps)).toBe('MIXING');
	});

	it('un fait de collaboration prime et survit à une réouverture', () => {
		const dates = { ...none, recordedAt: d1 };
		const done = productionStages(dates, [step({ status: 'DONE', doneAt: d2 })]);
		expect(done.RECORDING).toEqual({ source: 'COLLABORATION', at: d1 });
		const reopened = productionStages(dates, [step({ status: 'IN_PROGRESS' })]);
		expect(reopened.RECORDING).toEqual({ source: 'COLLABORATION', at: d1 });
		expect(nextProductionNeed(reopened, [step({ status: 'IN_PROGRESS' })])).toBe('MIXING');
	});

	it('une étape libérée redevient un besoin', () => {
		const steps = [step({ assigned: false, assignee: null })];
		expect(nextProductionNeed(productionStages(none, steps), steps)).toBe('RECORDING');
	});

	it('mixé : plus rien à suggérer', () => {
		const stages = productionStages({ ...none, recordedAt: d1, mixedAt: d2 }, []);
		expect(nextProductionNeed(stages, [])).toBeNull();
	});
});
