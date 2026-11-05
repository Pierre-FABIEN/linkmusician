import { describe, expect, it } from 'vitest';
import { cleanVenueName, venueNameKey, venueSchema } from './rules';

describe('annuaire des lieux', () => {
	it('repère les doublons malgré la casse, les accents et l’article', () => {
		expect(venueNameKey('Le Bar des Amis')).toBe('bar des amis');
		expect(venueNameKey('  bar   des amis ! ')).toBe('bar des amis');
		expect(venueNameKey('L’Épicerie Moderne')).toBe('epicerie moderne');
		expect(venueNameKey("L'épicerie moderne")).toBe('epicerie moderne');
		expect(venueNameKey('La Marquise')).not.toBe(venueNameKey('Marquis'));
	});

	it('nettoie le nom affiché', () => {
		expect(cleanVenueName(' Le\tBar\n des  Amis ')).toBe('Le Bar des Amis');
	});

	it('valide le formulaire', () => {
		const ok = venueSchema.safeParse({ name: ' Le Sonic ', kind: 'BAR', communeCode: '69123' });
		expect(ok.success && ok.data.name).toBe('Le Sonic');
		expect(venueSchema.safeParse({ name: '!!', kind: 'BAR', communeCode: '69123' }).success).toBe(
			false
		);
		expect(
			venueSchema.safeParse({ name: 'Chez moi', kind: 'HOME', communeCode: '69123' }).success
		).toBe(false);
		expect(venueSchema.safeParse({ name: 'Le Sonic', kind: 'BAR', communeCode: 'x' }).success).toBe(
			false
		);
	});
});
