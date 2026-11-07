import { describe, expect, it } from 'vitest';
import { compareContacts, groupNameSchema, howWeMet } from './rules';

describe('groupes de contacts', () => {
	it('un nom propre, court', () => {
		expect(groupNameSchema.parse('  Projet   funk ')).toBe('Projet funk');
		expect(groupNameSchema.safeParse('x').success).toBe(false);
		expect(groupNameSchema.safeParse('x'.repeat(41)).success).toBe(false);
	});
});

describe('comment on s’est rencontrés', () => {
	it.each([
		[{ jamsTogether: 1, collaborations: 0, inCarnet: true }, 'Une jam ensemble'],
		[
			{ jamsTogether: 3, collaborations: 1, inCarnet: true },
			'3 jams ensemble et une collaboration'
		],
		[{ jamsTogether: 0, collaborations: 2, inCarnet: true }, '2 collaborations'],
		[{ jamsTogether: 0, collaborations: 0, inCarnet: true }, 'Vous avez joué ensemble'],
		[{ jamsTogether: 0, collaborations: 0, inCarnet: false }, 'Vous vous écrivez']
	])('%o → %s', (input, expected) => {
		expect(howWeMet(input)).toBe(expected);
	});
});

describe('ordre du carnet', () => {
	it('le carnet d’abord, puis le plus récent, puis le nom', () => {
		const list = [
			{ displayName: 'Zoé', inCarnet: false, lastTogether: new Date('2026-11-01') },
			{ displayName: 'Bruno', inCarnet: true, lastTogether: new Date('2026-10-01') },
			{ displayName: 'Alice', inCarnet: true, lastTogether: new Date('2026-10-01') },
			{ displayName: 'Malik', inCarnet: true, lastTogether: new Date('2026-11-05') }
		];
		expect(list.sort(compareContacts).map((c) => c.displayName)).toEqual([
			'Malik',
			'Alice',
			'Bruno',
			'Zoé'
		]);
	});
});
