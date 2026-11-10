import { describe, expect, it } from 'vitest';
import { frenchDay, programView, safeFilename, splitSheetView } from './documents';

const now = new Date('2026-11-10T10:00:00Z');

describe('bulletin de partage (P3-15b)', () => {
	const view = splitSheetView(
		{
			title: 'Les nuits d’été',
			owner: { name: 'Les Étoiles', isBand: true },
			composedAt: new Date('2026-10-01T12:00:00Z'),
			credits: [
				{
					name: 'Zoé',
					kinds: ['COMPOSITION', 'ARRANGEMENT'],
					roles: ['Composition', 'Arrangement']
				},
				{ name: 'Léa', kinds: ['LYRICS', 'INSTRUMENT'], roles: ['Paroles', 'Basse électrique'] },
				{ name: 'Malik', kinds: ['INSTRUMENT'], roles: ['Batterie'] }
			]
		},
		now
	);

	it('coche paroles, musique et arrangement d’après les rôles, par ordre alphabétique', () => {
		expect(view.rows).toEqual([
			{
				name: 'Léa',
				lyrics: true,
				music: false,
				arrangement: false,
				roles: 'Paroles, Basse électrique'
			},
			{ name: 'Malik', lyrics: false, music: false, arrangement: false, roles: 'Batterie' },
			{
				name: 'Zoé',
				lyrics: false,
				music: true,
				arrangement: true,
				roles: 'Composition, Arrangement'
			}
		]);
	});

	it('ne fixe aucune part (09 §4) et garde des lignes libres', () => {
		expect(JSON.stringify(view.rows)).not.toMatch(/%|share|part/i);
		expect(view.blankRows).toBeGreaterThan(0);
		expect(view.notes.join(' ')).toContain('LinkMusician ne fixe aucune part');
		expect(view.notes.join(' ')).toContain('un parent signe aussi');
	});

	it('dit d’où vient le morceau et quand le document est préparé', () => {
		expect(view.facts).toEqual([
			{ label: 'Groupe', value: 'Les Étoiles' },
			{ label: 'Composé le', value: '1er octobre 2026' },
			{ label: 'Préparé le', value: '10 novembre 2026' }
		]);
		expect(view.filename).toBe('bulletin-de-partage-Les-nuits-d-ete.pdf');
	});

	it('morceau porté par une personne, sans date de composition', () => {
		const solo = splitSheetView(
			{ title: 'X', owner: { name: 'Léa', isBand: false }, composedAt: null, credits: [] },
			now
		);
		expect(solo.facts.map((f) => f.label)).toEqual(['Porté par', 'Préparé le']);
	});
});

describe('programme des œuvres (P3-15b)', () => {
	it('liste les morceaux composés, « À compléter » sans auteur connu, et des lignes pour les reprises', () => {
		const view = programView({
			band: 'Les Étoiles',
			works: [
				{ title: 'Sans paroles', creators: [] },
				{ title: 'Cœur battant', creators: ['Léa', 'Zoé'] }
			]
		});
		expect(view.rows).toEqual([
			{ title: 'Cœur battant', creators: 'Léa, Zoé' },
			{ title: 'Sans paroles', creators: 'À compléter' }
		]);
		expect(view.blanks).toEqual(['Date du concert', 'Lieu', 'Organisateur']);
		expect(view.blankRows).toBeGreaterThan(0);
		expect(view.filename).toBe('programme-des-oeuvres-Les-Etoiles.pdf');
	});
});

describe('safeFilename et frenchDay', () => {
	it('un nom de fichier sans caractère risqué', () => {
		expect(safeFilename('doc', '"; rm -rf / "')).toBe('doc-rm-rf.pdf');
		expect(safeFilename('doc', '!!!')).toBe('doc.pdf');
		expect(safeFilename('doc', 'a'.repeat(100))).toBe(`doc-${'a'.repeat(60)}.pdf`);
	});

	it('« 1er » le premier du mois, à l’heure de Paris', () => {
		expect(frenchDay(new Date('2026-10-01T12:00:00Z'))).toBe('1er octobre 2026');
		expect(frenchDay(new Date('2026-10-11T12:00:00Z'))).toBe('11 octobre 2026');
		expect(frenchDay(new Date('2026-09-30T23:30:00Z'))).toBe('1er octobre 2026');
	});
});
