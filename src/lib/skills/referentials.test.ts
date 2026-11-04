import { describe, expect, it } from 'vitest';
import { checkGenreData, checkInstrumentData } from './referentials';
import { INSTRUMENT_FAMILIES, INSTRUMENT_FAMILY_LABELS } from './instruments';
import { instrumentsByFamily } from '../../../prisma/seed-data/instruments.js';
import { genreTree } from '../../../prisma/seed-data/genres.js';

describe('référentiel des instruments (prisma/seed-data)', () => {
	it('est intègre', () => {
		expect(checkInstrumentData(instrumentsByFamily)).toEqual([]);
	});

	it('compte une soixantaine d’instruments, voix incluse', () => {
		const count = Object.values(instrumentsByFamily).flat().length;
		expect(count).toBeGreaterThanOrEqual(55);
		expect(count).toBeLessThanOrEqual(75);
		expect(instrumentsByFamily.VOICE.map(([slug]) => slug)).toContain('chant');
	});

	it('nomme chaque famille', () => {
		for (const family of INSTRUMENT_FAMILIES) {
			expect(INSTRUMENT_FAMILY_LABELS[family].trim()).not.toBe('');
		}
	});
});

describe('référentiel des genres (prisma/seed-data, D12)', () => {
	it('est intègre', () => {
		expect(checkGenreData(genreTree)).toEqual([]);
	});

	it('compte environ 80 à 100 genres sur deux niveaux', () => {
		const count = genreTree.length + genreTree.flatMap((g) => g.children).length;
		expect(count).toBeGreaterThanOrEqual(80);
		expect(count).toBeLessThanOrEqual(110);
		expect(genreTree.every((g) => g.children.length > 0)).toBe(true);
	});
});

describe('contrôles', () => {
	it('signale doublons, slugs invalides et familles inconnues', () => {
		expect(
			checkInstrumentData({
				VOICE: [
					['chant', 'Chant'],
					['chant', 'Chant bis']
				],
				KAZOO: [['Kazoo', 'Kazoo ']]
			})
		).toEqual(
			expect.arrayContaining([
				'slug en double : « chant »',
				'famille inconnue : « KAZOO »',
				'slug invalide : « Kazoo »',
				'nom invalide pour « Kazoo »',
				'famille sans instrument : « BRASS »'
			])
		);
		expect(
			checkGenreData([{ slug: 'rock', name: 'Rock', children: [['rock', 'Rock encore']] }])
		).toEqual(['slug en double : « rock »']);
	});
});
