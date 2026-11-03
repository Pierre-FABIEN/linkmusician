import { describe, expect, it } from 'vitest';
import { ageOn, checkBirthDate, civilDateToUtc, parseCivilDate } from './age';
import { checkHandle, slugifyHandle, suggestHandle } from './handle';

const day = (s: string) => parseCivilDate(s)!;

describe('parseCivilDate', () => {
	it('accepte une date valide', () => {
		expect(parseCivilDate('2008-11-03')).toEqual({ year: 2008, month: 11, day: 3 });
	});

	it.each(['', '03/11/2008', '2008-13-01', '2023-02-29', '2008-02-30', '2008-1-3'])(
		'refuse « %s »',
		(value) => {
			expect(parseCivilDate(value)).toBeNull();
		}
	);
});

describe('ageOn', () => {
	it("compte l'âge révolu", () => {
		expect(ageOn(day('2010-11-03'), day('2026-11-03'))).toBe(16); // le jour même
		expect(ageOn(day('2010-11-04'), day('2026-11-03'))).toBe(15); // la veille
	});

	it('gère les personnes nées un 29 février', () => {
		expect(ageOn(day('2008-02-29'), day('2024-02-28'))).toBe(15);
		expect(ageOn(day('2008-02-29'), day('2024-02-29'))).toBe(16);
		expect(ageOn(day('2008-02-29'), day('2025-02-28'))).toBe(16);
		expect(ageOn(day('2009-02-28'), day('2025-03-01'))).toBe(16);
	});
});

describe('checkBirthDate', () => {
	const today = day('2026-11-03');

	it.each([
		['2010-11-03', true], // 16 ans aujourd'hui
		['1990-05-15', true],
		['2010-11-04', 'too_young'], // 16 ans demain
		['2026-11-04', 'future'],
		['1890-01-01', 'implausible'],
		['pas-une-date', 'invalid']
	])('%s → %s', (value, expected) => {
		const result = checkBirthDate(value, today);
		if (expected === true) expect(result.ok).toBe(true);
		else expect(result).toEqual({ ok: false, reason: expected });
	});
});

describe('civilDateToUtc', () => {
	it('donne minuit UTC, sans décalage de fuseau', () => {
		expect(civilDateToUtc('2008-02-29').toISOString()).toBe('2008-02-29T00:00:00.000Z');
	});
});

describe('checkHandle', () => {
	it.each([
		['lea-guitare', true],
		['dj_42', true],
		['ab', 'too_short'],
		['a'.repeat(31), 'too_long'],
		['-lea', 'format'],
		['léa', 'format'],
		['Lea', 'format'],
		['admin', 'reserved'],
		['bienvenue', 'reserved']
	])('%s → %s', (handle, expected) => {
		const result = checkHandle(handle);
		if (expected === true) expect(result.ok).toBe(true);
		else expect(result).toEqual({ ok: false, reason: expected });
	});
});

describe('slugifyHandle', () => {
	it.each([
		['Léa Guitare', 'lea-guitare'],
		['  Zoé__Batterie!! ', 'zoe__batterie'],
		['Ça va ? Ça roule.', 'ca-va-ca-roule'],
		['---', '']
	])('%j → %j', (input, expected) => {
		expect(slugifyHandle(input)).toBe(expected);
	});

	it('ne dépasse jamais la longueur maximale', () => {
		expect(slugifyHandle('x'.repeat(80)).length).toBeLessThanOrEqual(30);
	});
});

describe('suggestHandle', () => {
	const takenSet = (...taken: string[]) => {
		const set = new Set(taken);
		return async (candidate: string) => set.has(candidate);
	};

	it('garde la base si elle est libre', async () => {
		expect(await suggestHandle('Léa Guitare', takenSet())).toBe('lea-guitare');
	});

	it('ajoute un suffixe en cas de collision', async () => {
		expect(await suggestHandle('lea', takenSet('lea', 'lea-2'))).toBe('lea-3');
	});

	it('complète une base réservée ou trop courte', async () => {
		expect(await suggestHandle('admin', takenSet())).toBe('admin-lm');
		expect(await suggestHandle('é', takenSet())).toBe('e-lm');
		expect(await suggestHandle('!!!', takenSet())).toBe('musicien-lm');
	});

	it('respecte la longueur maximale avec le suffixe', async () => {
		const long = 'a'.repeat(30);
		const result = await suggestHandle(long, takenSet(long));
		expect(result).toBe('a'.repeat(28) + '-2');
	});
});
