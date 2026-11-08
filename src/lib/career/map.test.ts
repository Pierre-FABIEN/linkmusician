import { describe, expect, it } from 'vitest';
import { actsToCelebrate, careerMap, type CareerFacts } from './map';

const none: CareerFacts = {
	jamAppreciations: 0,
	collaborations: 0,
	worksTogether: 0,
	worksSolo: 0,
	recordings: 0
};
const status = (facts: Partial<CareerFacts>) =>
	careerMap({ ...none, ...facts }).acts.map((a) => a.status);

describe('carte de carrière (P3-13)', () => {
	it('au départ : acte I en cours, II et III ouverts, la suite dans le brouillard', () => {
		expect(status({})).toEqual(['current', 'open', 'open', 'fog', 'fog', 'fog', 'fog', 'fog']);
		expect(careerMap(none).current).toBe(1);
	});

	it('une jam où l’on a reçu une appréciation franchit l’acte I', () => {
		expect(status({ jamAppreciations: 1 }).slice(0, 2)).toEqual(['passed', 'current']);
	});

	it('une collaboration confirmée franchit aussi l’acte I', () => {
		expect(careerMap({ ...none, collaborations: 1 }).passed).toEqual([1]);
	});

	it('un morceau composé à plusieurs franchit l’acte II, pas un morceau composé seul·e', () => {
		expect(careerMap({ ...none, worksTogether: 1 }).passed).toEqual([2]);
		const solo = careerMap({ ...none, worksSolo: 3 });
		expect(solo.passed).toEqual([]);
		expect(solo.soloOnly).toBe(true);
	});

	it('pas d’ordre imposé : l’acte en cours est le premier qui reste', () => {
		const map = careerMap({ ...none, worksTogether: 1 });
		expect(map.current).toBe(1);
		expect(status({ worksTogether: 1 }).slice(0, 3)).toEqual(['current', 'passed', 'open']);
	});

	it('l’acte III : un enregistrement corroboré ; ensuite, plus d’acte jouable en cours', () => {
		const map = careerMap({ ...none, jamAppreciations: 2, worksTogether: 1, recordings: 1 });
		expect(map.passed).toEqual([1, 2, 3]);
		expect(map.current).toBeNull();
	});

	it('jamais l’XP : les faits seuls comptent (pas de champ de points)', () => {
		expect(Object.keys(none).some((k) => /xp|level|trust/i.test(k))).toBe(false);
	});

	it('l’ambition met des actes en avant, sans changer leur état', () => {
		const stage = careerMap(none, 'STAGE');
		expect(stage.acts.filter((a) => a.highlighted).map((a) => a.number)).toEqual([2, 5]);
		expect(stage.acts.map((a) => a.status)).toEqual(careerMap(none).acts.map((a) => a.status));
	});

	it('une épreuve n’est fêtée qu’une fois', () => {
		expect(actsToCelebrate([1, 2], [])).toEqual([1, 2]);
		expect(actsToCelebrate([1, 2], [1])).toEqual([2]);
		expect(actsToCelebrate([1], [1])).toEqual([]);
	});
});
