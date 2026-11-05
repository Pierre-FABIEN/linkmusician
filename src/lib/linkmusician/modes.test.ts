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
