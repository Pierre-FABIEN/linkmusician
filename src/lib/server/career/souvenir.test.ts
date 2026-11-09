import { describe, expect, it } from 'vitest';
import { renderSouvenir, SOUVENIR_SIZE } from './souvenir';

describe('carte souvenir (P3-14)', () => {
	it('génère un PNG 1200 × 630', async () => {
		const png = await renderSouvenir({
			displayName: 'Léa Martin',
			actTitle: 'Acte II · La création',
			trial: 'Un morceau composé à plusieurs, rôles confirmés par l’équipe.',
			date: 'novembre 2026'
		});
		// Signature PNG, puis largeur et hauteur dans l'en-tête IHDR.
		expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
		expect(png.readUInt32BE(16)).toBe(SOUVENIR_SIZE.width);
		expect(png.readUInt32BE(20)).toBe(SOUVENIR_SIZE.height);
		expect(png.length).toBeGreaterThan(10_000);
	}, 30_000);
});
