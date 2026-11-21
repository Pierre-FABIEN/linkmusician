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
	// D82 : « joué ensemble » seulement pour une collaboration confirmée ;
	// une jam commune est une déclaration, dite comme telle.
	it.each([
		[{ jamsTogether: 1, collaborations: 0, inCarnet: true }, 'Une même jam déclarée'],
		[
			{ jamsTogether: 3, collaborations: 1, inCarnet: true },
			'Une collaboration confirmée et 3 mêmes jams déclarées'
		],
		[{ jamsTogether: 0, collaborations: 2, inCarnet: true }, '2 collaborations confirmées'],
		[{ jamsTogether: 0, collaborations: 0, inCarnet: true }, 'Dans ton carnet'],
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
