import { describe, expect, it } from 'vitest';
import { capacityLabel, isPromoterProfileListed } from './promoter';
import { promoterProfileSchema } from '#lib/schema/crafts/promoterProfileSchema';

describe('profil d’organisateur·rice (P5-05a)', () => {
	it('se trouve dans la recherche dès qu’un type d’événement est coché', () => {
		expect(isPromoterProfileListed({ eventKinds: [] })).toBe(false);
		expect(isPromoterProfileListed({ eventKinds: ['CONCERTS'] })).toBe(true);
	});

	it('écrit la jauge en mots', () => {
		expect(capacityLabel(null)).toBeNull();
		expect(capacityLabel(1)).toBe('1 personne');
		expect(capacityLabel(1200)).toMatch(/^1\s200 personnes$/);
	});

	it('borne les genres, la jauge et vérifie les liens', () => {
		const ok = promoterProfileSchema.safeParse({
			eventKinds: ['CONCERTS', 'OPEN_STAGES'],
			genreIds: ['a', 'b'],
			capacity: 120,
			references: [{ title: 'Plateau rock', url: 'https://exemple.fr/agenda' }]
		});
		expect(ok.success).toBe(true);
		expect(
			promoterProfileSchema.safeParse({ genreIds: ['a', 'b', 'c', 'd', 'e', 'f'] }).success
		).toBe(false);
		expect(promoterProfileSchema.safeParse({ capacity: 0 }).success).toBe(false);
		expect(
			promoterProfileSchema.safeParse({ references: [{ title: 'x', url: 'pas un lien' }] }).success
		).toBe(false);
	});
});
