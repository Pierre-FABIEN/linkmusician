import { describe, expect, it } from 'vitest';
import { programView, splitSheetView } from '#lib/demarches/documents';
import { printable, renderProgramPdf, renderSplitSheetPdf } from './pdf';

describe('rendu PDF des documents (P3-15b)', () => {
	it('produit un PDF pour le bulletin et le programme, même long', () => {
		const credits = Array.from({ length: 30 }, (_, i) => ({
			name: `Personne ${i}`,
			kinds: ['LYRICS' as const],
			roles: ['Paroles']
		}));
		const sheet = renderSplitSheetPdf(
			splitSheetView({
				title: 'Morceau',
				owner: { name: 'G', isBand: true },
				composedAt: null,
				credits
			})
		);
		const program = renderProgramPdf(
			programView({ band: 'G', works: [{ title: 'Cœur', creators: ['Léa'] }] })
		);
		for (const pdf of [sheet, program]) {
			expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
			expect(pdf.length).toBeGreaterThan(1000);
		}
	});

	it('printable : apostrophes droites, espaces insécables, rien hors des polices standard', () => {
		expect(printable('L’été « ici »')).toBe("L'été « ici »");
		expect(printable('1 000')).toBe('1 000');
		expect(printable('Cœur · 100 € — ok')).toBe('Cœur · 100 € — ok');
		expect(printable('🎸 Riff')).toBe(' Riff');
	});
});
