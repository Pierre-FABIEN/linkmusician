import { describe, expect, expectTypeOf, it } from 'vitest';
import {
	EMPTY_REPUTATION,
	internalScore,
	MIN_RESPONSE_SAMPLE,
	publicReputation,
	responseBucket,
	type ReputationFacts
} from './reputation';

const facts = (over: Partial<ReputationFacts> = {}): ReputationFacts => ({
	...EMPTY_REPUTATION,
	...over
});

describe('réactivité', () => {
	it('ne dit rien sous le seuil de demandes reçues', () => {
		expect(responseBucket([])).toBeNull();
		expect(responseBucket(Array(MIN_RESPONSE_SAMPLE - 1).fill(1))).toBeNull();
	});

	it('par médiane : un oubli ne rend pas lent', () => {
		expect(responseBucket([2, 5, null])).toBe('FAST');
		expect(responseBucket([30, 40, 2])).toBe('DAY');
		expect(responseBucket([60, null, 2])).toBe('SLOW');
		expect(responseBucket([null, null, 1])).toBe('SLOW');
	});

	it('seuils de 24 h et 48 h exclus', () => {
		expect(responseBucket([24, 24, 24])).toBe('DAY');
		expect(responseBucket([48, 48, 48])).toBe('SLOW');
	});
});

describe('score interne', () => {
	it('vaut 0 sans aucun fait confirmé', () => {
		expect(internalScore(facts())).toBe(0);
	});

	it('croît avec les faits, à rendements décroissants', () => {
		const one = internalScore(facts({ distinctCounterparts: 1 }));
		const two = internalScore(facts({ distinctCounterparts: 2 }));
		const ten = internalScore(facts({ distinctCounterparts: 10 }));
		const eleven = internalScore(facts({ distinctCounterparts: 11 }));
		expect(two).toBeGreaterThan(one);
		expect(eleven - ten).toBeLessThan(two - one);
	});

	it('des personnes distinctes pèsent plus que des répétitions', () => {
		const sameTwice = internalScore(facts({ confirmedCollabs: 5, distinctCounterparts: 1 }));
		const fivePeople = internalScore(facts({ confirmedCollabs: 5, distinctCounterparts: 5 }));
		expect(fivePeople).toBeGreaterThan(sameTwice);
	});

	it('la réactivité ajoute ou retire un peu', () => {
		const base = facts({ distinctCounterparts: 3 });
		const s = internalScore(base);
		expect(internalScore({ ...base, responseBucket: 'FAST' })).toBeGreaterThan(s);
		expect(internalScore({ ...base, responseBucket: 'SLOW' })).toBeLessThan(s);
	});

	it('les appréciations par libellé ne comptent pas en double avec les endosseurs', () => {
		const a = facts({ distinctEndorsers: 2 });
		const b = facts({ distinctEndorsers: 2, endorsementsByKind: [{ label: 'fiable', count: 9 }] });
		expect(internalScore(a)).toBe(internalScore(b));
	});

	it('aucun champ d’XP, de niveau ni de confiance dans les faits', () => {
		expectTypeOf<
			Extract<keyof ReputationFacts, 'xp' | 'level' | 'trustLevel' | 'tier'>
		>().toBeNever();
		const keys = Object.keys(EMPTY_REPUTATION);
		expect(keys.some((k) => /xp|level|trust|tier|niveau/i.test(k))).toBe(false);
	});
});

describe('carte publique', () => {
	it('ne laisse jamais passer le score interne', () => {
		const withScore = { ...facts({ confirmedCollabs: 3 }), internalScore: 12.5 };
		const card = publicReputation(withScore);
		expect(card).not.toHaveProperty('internalScore');
		expect(JSON.stringify(card)).not.toContain('12.5');
		expect(card.confirmedCollabs).toBe(3);
	});
});
