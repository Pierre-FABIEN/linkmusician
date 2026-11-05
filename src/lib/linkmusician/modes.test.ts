import { describe, expect, it } from 'vitest';
import { isPlayMode, orderedModes } from './modes';

describe('modes de jeu (P2-12)', () => {
	it('sans préférence : carrière puis jam, rien à reprendre', () => {
		expect(orderedModes(null).map((m) => [m.mode, m.resume])).toEqual([
			['CAREER', false],
			['JAM', false]
		]);
	});

	it('le dernier mode choisi passe en premier, à reprendre', () => {
		expect(orderedModes('JAM').map((m) => [m.mode, m.resume])).toEqual([
			['JAM', true],
			['CAREER', false]
		]);
	});

	it('reconnaît un mode valide', () => {
		expect(isPlayMode('JAM')).toBe(true);
		expect(isPlayMode('BATTLE')).toBe(false);
	});
});

describe('présentation des modes (P2-12b)', () => {
	it('la première fois : la présentation ; ensuite : le mode', async () => {
		const { destinationFor, modeFromSlug } = await import('./modes');
		expect(destinationFor('JAM', [])).toBe('/jouer/jam');
		expect(destinationFor('JAM', ['JAM'])).toBe('/jam');
		expect(destinationFor('CAREER', ['JAM'])).toBe('/jouer/carriere');
		expect(modeFromSlug('carriere')).toBe('CAREER');
		expect(modeFromSlug('inconnu')).toBeNull();
	});
});
