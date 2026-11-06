import { describe, expect, it } from 'vitest';
import {
	components,
	findClosedCircles,
	MAX_CLIQUE_SIZE,
	sharedIpCount,
	type Interaction
} from './collusion';

const link = (a: string, b: string, times = 1): Interaction[] =>
	Array.from({ length: times }, () => ({ a, b }));

describe('cercles fermés', () => {
	it('composantes connexes', () => {
		expect(components([...link('a', 'b'), ...link('b', 'c'), ...link('x', 'y')])).toEqual(
			expect.arrayContaining([
				['a', 'b', 'c'],
				['x', 'y']
			])
		);
	});

	it('trois comptes qui ne collaborent qu’entre eux : un cas', () => {
		const clique = [...link('a', 'b', 2), ...link('b', 'c', 2), ...link('a', 'c', 2)];
		expect(findClosedCircles(clique)).toEqual([
			{ memberIds: ['a', 'b', 'c'], memberKey: 'a|b|c', interactions: 6, density: 1 }
		]);
	});

	it('le même trio relié à la scène locale : rien', () => {
		const clique = [...link('a', 'b', 2), ...link('b', 'c', 2), ...link('a', 'c', 2)];
		const scene = [...link('c', 'd'), ...link('d', 'e'), ...link('e', 'f')];
		// Le groupe a–f est connexe mais peu dense : une scène, pas une clique.
		expect(findClosedCircles([...clique, ...scene])).toEqual([]);
	});

	it('deux personnes qui ont joué une fois ensemble : rien (trop peu)', () => {
		expect(findClosedCircles(link('a', 'b', 2))).toEqual([]);
		expect(findClosedCircles(link('a', 'b', 4))).toHaveLength(1);
	});

	it('une grande communauté n’est pas une clique', () => {
		const people = Array.from({ length: MAX_CLIQUE_SIZE + 1 }, (_, i) => `p${i}`);
		const all: Interaction[] = [];
		for (let i = 0; i < people.length; i++) {
			for (let j = i + 1; j < people.length; j++) all.push(...link(people[i], people[j]));
		}
		expect(findClosedCircles(all)).toEqual([]);
	});

	it('une chaîne peu dense : rien', () => {
		const chain = [
			...link('a', 'b', 3),
			...link('b', 'c', 3),
			...link('c', 'd', 3),
			...link('d', 'e', 3)
		];
		expect(findClosedCircles(chain)).toEqual([]);
	});

	it('s’auto-apprécier ne compte pas', () => {
		expect(findClosedCircles(link('a', 'a', 10))).toEqual([]);
	});
});

describe('empreinte d’appareil', () => {
	it('compte les adresses IP partagées par au moins deux membres', () => {
		const ips = new Map([
			['a', new Set(['1.1.1.1', '2.2.2.2'])],
			['b', new Set(['1.1.1.1'])],
			['c', new Set(['3.3.3.3'])]
		]);
		expect(sharedIpCount(ips)).toBe(1);
		expect(sharedIpCount(new Map())).toBe(0);
	});
});
