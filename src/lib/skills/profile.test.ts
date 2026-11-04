import { describe, expect, it } from 'vitest';
import {
	checkMusicalProfile,
	isProfileComplete,
	MAX_INFLUENCE_LENGTH,
	parseInfluences
} from './profile';
import { INSTRUMENT_LEVELS, isInstrumentLevel, levelLabel } from './levels';

const base = {
	instruments: [{ instrumentId: 'guitare', level: 3 }],
	genreIds: ['rock'],
	influences: ''
};

describe('échelle de niveau (D11)', () => {
	it('a cinq niveaux décrits', () => {
		expect(INSTRUMENT_LEVELS.map((l) => l.level)).toEqual([1, 2, 3, 4, 5]);
		expect(INSTRUMENT_LEVELS.every((l) => l.descriptor.length > 10)).toBe(true);
	});

	it('affiche toujours « déclaré »', () => {
		expect(levelLabel(3)).toBe('Confirmé (déclaré)');
	});

	it('refuse un niveau hors échelle', () => {
		expect([0, 6, 2.5, '3', null].some((v) => isInstrumentLevel(v))).toBe(false);
	});
});

describe('parseInfluences', () => {
	it('une influence par ligne, nettoyée et dédoublonnée', () => {
		expect(parseInfluences('  Radiohead \n\nradiohead\nNina   Simone\r\nBjörk\t')).toEqual([
			'Radiohead',
			'Nina Simone',
			'Björk'
		]);
	});

	it('neutralise les caractères de contrôle et laisse le HTML en texte', () => {
		expect(parseInfluences('<b>Daft\u0000Punk</b>')).toEqual(['<b>Daft Punk</b>']);
	});
});

describe('checkMusicalProfile', () => {
	it('accepte un instrument unique, principal d’office', () => {
		const result = checkMusicalProfile(base);
		expect(result).toMatchObject({ ok: true, profile: { primaryInstrumentId: 'guitare' } });
	});

	it('exige un principal parmi plusieurs instruments', () => {
		const two = {
			...base,
			instruments: [
				{ instrumentId: 'guitare', level: 3 },
				{ instrumentId: 'chant', level: 2 }
			]
		};
		expect(checkMusicalProfile(two)).toEqual({ ok: false, problems: ['primary'] });
		expect(checkMusicalProfile({ ...two, primaryInstrumentId: 'chant' })).toMatchObject({
			ok: true
		});
		expect(checkMusicalProfile({ ...two, primaryInstrumentId: 'piano' })).toEqual({
			ok: false,
			problems: ['primary']
		});
	});

	it('signale les saisies hors règles', () => {
		const result = checkMusicalProfile({
			instruments: [
				{ instrumentId: 'a', level: 1 },
				{ instrumentId: 'a', level: 7 },
				...['b', 'c', 'd', 'e'].map((id) => ({ instrumentId: id, level: 2 }))
			],
			primaryInstrumentId: 'a',
			genreIds: ['1', '2', '3', '4', '5', '6'],
			influences: Array.from({ length: 11 }, (_, i) => `Artiste ${i}`).join('\n')
		});
		expect(result).toEqual({
			ok: false,
			problems: [
				'instruments_too_many',
				'instruments_duplicate',
				'level',
				'genres_too_many',
				'influences_too_many'
			]
		});
	});

	it('exige au moins un instrument et un genre, borne la longueur des influences', () => {
		expect(
			checkMusicalProfile({
				instruments: [],
				genreIds: [],
				influences: 'x'.repeat(MAX_INFLUENCE_LENGTH + 1)
			})
		).toEqual({ ok: false, problems: ['instruments_empty', 'genres_empty', 'influence_too_long'] });
	});
});

describe('isProfileComplete', () => {
	const complete = { instrumentCount: 1, genreCount: 1, hasZone: true, bio: 'Guitariste.' };

	it('reconnaît un profil complété', () => {
		expect(isProfileComplete(complete)).toBe(true);
	});

	it.each([
		['sans instrument', { instrumentCount: 0 }],
		['sans genre', { genreCount: 0 }],
		['sans zone', { hasZone: false }],
		['sans bio', { bio: '   ' }],
		['bio absente', { bio: null }]
	])('refuse un profil %s', (_, patch) => {
		expect(isProfileComplete({ ...complete, ...patch })).toBe(false);
	});
});
