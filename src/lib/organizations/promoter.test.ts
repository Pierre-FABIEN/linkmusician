import { describe, expect, it } from 'vitest';
import { gigSlotGaps, promoterOrgProfileSchema, promoterOrgSchema } from './promoter';

const base = {
	name: '  Asso   Bruit Rose ',
	bio: '',
	eventKinds: ['OPEN_STAGES', 'CONCERTS', 'CONCERTS'],
	genreIds: ['a', 'a', 'b'],
	capacity: ' 300 ',
	communeCode: '31555'
};

describe('organisation d’organisateur·rices (P5-05b)', () => {
	it('normalise la fiche : nom, types dans l’ordre du référentiel, genres sans doublon, jauge', () => {
		const parsed = promoterOrgProfileSchema.parse(base);
		expect(parsed).toEqual({
			name: 'Asso Bruit Rose',
			bio: null,
			eventKinds: ['CONCERTS', 'OPEN_STAGES'],
			genreIds: ['a', 'b'],
			capacity: 300,
			communeCode: '31555'
		});
		expect(promoterOrgProfileSchema.parse({ ...base, capacity: '' }).capacity).toBeNull();
	});

	it('refuse un nom trop court, une jauge invalide, trop de genres, une commune inventée', () => {
		expect(promoterOrgSchema.safeParse({ name: 'A' }).success).toBe(false);
		expect(promoterOrgProfileSchema.safeParse({ ...base, capacity: '0' }).success).toBe(false);
		expect(promoterOrgProfileSchema.safeParse({ ...base, capacity: 'beaucoup' }).success).toBe(
			false
		);
		expect(
			promoterOrgProfileSchema.safeParse({ ...base, genreIds: ['a', 'b', 'c', 'd', 'e', 'f'] })
				.success
		).toBe(false);
		expect(promoterOrgProfileSchema.safeParse({ ...base, communeCode: 'Paris' }).success).toBe(
			false
		);
	});

	it('dit ce qui manque pour publier un plateau en son nom', () => {
		expect(gigSlotGaps({ hasCommune: false, eventKinds: [] })).toEqual([
			'la ville de l’organisation',
			'ce qu’elle organise'
		]);
		expect(gigSlotGaps({ hasCommune: true, eventKinds: ['CONCERTS'] })).toEqual([]);
	});
});
