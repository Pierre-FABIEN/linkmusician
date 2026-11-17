import { describe, expect, it } from 'vitest';
import {
	bandLineupSchema,
	formationHint,
	formationMatch,
	lineupSummary,
	repertoireMatch
} from './lineup';

describe('bandLineupSchema', () => {
	it('lit une valeur vide comme « non précisé »', () => {
		expect(bandLineupSchema.parse({ formation: '', repertoire: undefined })).toEqual({
			formation: null,
			repertoire: null
		});
	});
	it('accepte les codes connus', () => {
		expect(bandLineupSchema.parse({ formation: 'DUO', repertoire: 'COVERS' })).toEqual({
			formation: 'DUO',
			repertoire: 'COVERS'
		});
	});
	it('refuse un code inconnu', () => {
		expect(bandLineupSchema.safeParse({ formation: 'QUARTET' }).success).toBe(false);
		expect(bandLineupSchema.safeParse({ repertoire: 'covers' }).success).toBe(false);
	});
});

describe('formationMatch', () => {
	it('sans recherche, tout convient', () => {
		expect(formationMatch(null, null)).toBe('yes');
		expect(formationMatch(null, 'TRIO')).toBe('yes');
	});
	it('une formation non précisée reste inconnue, jamais « non »', () => {
		expect(formationMatch('DUO', null)).toBe('unknown');
	});
	it('compare la formation déclarée', () => {
		expect(formationMatch('DUO', 'DUO')).toBe('yes');
		expect(formationMatch('DUO', 'BAND')).toBe('no');
		expect(formationMatch('DUO', 'SOLO')).toBe('no');
	});
});

describe('repertoireMatch', () => {
	it('un répertoire non précisé reste inconnu', () => {
		expect(repertoireMatch('COVERS', null)).toBe('unknown');
	});
	it('« les deux » convient à chaque recherche', () => {
		expect(repertoireMatch('COVERS', 'BOTH')).toBe('yes');
		expect(repertoireMatch('ORIGINALS', 'BOTH')).toBe('yes');
		expect(repertoireMatch('BOTH', 'BOTH')).toBe('yes');
	});
	it('distingue reprises et compositions', () => {
		expect(repertoireMatch('COVERS', 'COVERS')).toBe('yes');
		expect(repertoireMatch('COVERS', 'ORIGINALS')).toBe('no');
		expect(repertoireMatch('BOTH', 'COVERS')).toBe('no');
	});
	it('sans recherche, tout convient', () => {
		expect(repertoireMatch(null, 'ORIGINALS')).toBe('yes');
	});
});

describe('lineupSummary', () => {
	it('résume ce qui est précisé', () => {
		expect(lineupSummary({ formation: 'DUO', repertoire: 'COVERS' })).toBe('Duo · Reprises');
		expect(lineupSummary({ formation: null, repertoire: 'BOTH' })).toBe('Reprises et compositions');
		expect(lineupSummary({ formation: null, repertoire: null })).toBeNull();
	});
});

describe('formationHint', () => {
	it('se tait quand la formation correspond à l’effectif', () => {
		expect(formationHint('DUO', 2)).toBeNull();
		expect(formationHint('BAND', 6)).toBeNull();
		expect(formationHint(null, 3)).toBeNull();
	});
	it('signale un écart sans rien corriger', () => {
		expect(formationHint('DUO', 4)).toContain('4 membres actifs');
		expect(formationHint('BAND', 1)).toContain('1 membre actif');
	});
});
