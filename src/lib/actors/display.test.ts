import { describe, expect, it } from 'vitest';
import { initialsOf } from './display';
import { adultBirthCutoff, isIndexable } from './visibility';

describe('initialsOf', () => {
	it.each([
		['Léa Martin', 'LM'],
		['léa', 'L'],
		['Jean-Paul Sartre Dupont', 'JP'],
		['  ', '?'],
		['Éloïse  Ñ', 'ÉÑ']
	])('%s → %s', (name, expected) => {
		expect(initialsOf(name)).toBe(expected);
	});
});

describe('indexation des profils (D19)', () => {
	const now = new Date('2026-11-05T10:00:00Z');
	const born = (s: string) => new Date(`${s}T00:00:00Z`);

	it('majeur le jour de ses 18 ans', () => {
		expect(adultBirthCutoff(now).toISOString().slice(0, 10)).toBe('2008-11-05');
		expect(isIndexable(born('2008-11-05'), now)).toBe(true);
		expect(isIndexable(born('2008-11-06'), now)).toBe(false);
	});

	it('jamais indexé sans date de naissance', () => {
		expect(isIndexable(null, now)).toBe(false);
		expect(isIndexable(undefined, now)).toBe(false);
	});

	it('29 février : majeur le 1er mars', () => {
		const feb28 = new Date('2026-02-28T12:00:00Z');
		expect(isIndexable(born('2008-02-29'), feb28)).toBe(false);
		expect(isIndexable(born('2008-02-29'), new Date('2026-03-01T12:00:00Z'))).toBe(true);
	});
});
