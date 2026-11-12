import { describe, expect, it } from 'vitest';
import { actsToCelebrate, careerMap, type CareerFacts } from './map';

const none: CareerFacts = {
	jamAppreciations: 0,
	collaborations: 0,
	worksTogether: 0,
	worksSolo: 0,
	recordings: 0,
	productions: 0,
	verifiedGigs: 0,
	tours: 0
};
const status = (facts: Partial<CareerFacts>) =>
	careerMap({ ...none, ...facts }).acts.map((a) => a.status);

describe('carte de carrière (P3-13)', () => {
	it('au départ : acte I en cours, II à V ouverts, la suite dans le brouillard', () => {
		expect(status({})).toEqual(['current', 'open', 'open', 'open', 'open', 'fog', 'fog', 'fog']);
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

	it('l’acte III : un enregistrement corroboré ou vérifié ; l’acte IV devient l’acte en cours', () => {
		const map = careerMap({ ...none, jamAppreciations: 2, worksTogether: 1, recordings: 1 });
		expect(map.passed).toEqual([1, 2, 3]);
		expect(map.current).toBe(4);
	});

	it('l’acte IV : un morceau produit ; l’acte V devient l’acte en cours (P4-10)', () => {
		const map = careerMap({
			...none,
			jamAppreciations: 2,
			worksTogether: 1,
			recordings: 1,
			productions: 1
		});
		expect(map.passed).toEqual([1, 2, 3, 4]);
		expect(map.current).toBe(5);
	});

	it('l’acte V : un concert vérifié ; ensuite, plus d’acte jouable en cours (P5-08)', () => {
		const map = careerMap({
			...none,
			jamAppreciations: 2,
			worksTogether: 1,
			recordings: 1,
			productions: 1,
			verifiedGigs: 1
		});
		expect(map.passed).toEqual([1, 2, 3, 4, 5]);
		expect(map.current).toBeNull();
	});

	it('la tournée est une épreuve de plus, affichée, jamais bloquante (P5-08)', () => {
		const act5 = (f: Partial<CareerFacts>) => careerMap({ ...none, ...f }).acts[4];
		expect(act5({}).bonusTrial).toEqual({ label: expect.stringMatching(/tournée/), done: false });
		// La tournée seule ne franchit pas l'acte : il faut le concert vérifié.
		expect(act5({ tours: 1 }).status).toBe('open');
		expect(act5({ verifiedGigs: 1 }).status).toBe('passed');
		expect(act5({ verifiedGigs: 1, tours: 1 }).bonusTrial?.done).toBe(true);
		expect(
			careerMap(none)
				.acts.filter((a) => a.bonusTrial)
				.map((a) => a.number)
		).toEqual([5]);
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
