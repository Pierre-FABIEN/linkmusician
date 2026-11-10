import { describe, expect, it } from 'vitest';
import {
	isProducerProfileListed,
	MAX_PRODUCER_GENRES,
	normalizeRate,
	PRODUCER_SPECIALTIES,
	PRODUCER_SPECIALTY_INFO
} from './producer';
import { producerProfileSchema } from '#lib/schema/crafts/producerProfileSchema';

describe('référentiel du producteur ou de la productrice (P4-04)', () => {
	it('libelle chaque spécialité', () => {
		for (const s of PRODUCER_SPECIALTIES)
			expect(PRODUCER_SPECIALTY_INFO[s].label.trim()).not.toBe('');
	});

	it('trouvable dès qu’une spécialité est cochée', () => {
		expect(isProducerProfileListed({ specialties: [] })).toBe(false);
		expect(isProducerProfileListed({ specialties: ['BEATMAKING'] })).toBe(true);
	});

	it('resserre les tarifs indicatifs', () => {
		expect(normalizeRate('  150 €   le titre ')).toBe('150 € le titre');
	});
});

describe('producerProfileSchema', () => {
	const base = {
		specialties: [],
		genreIds: [],
		software: '',
		rate: '',
		mobility: [],
		references: []
	};

	it(`limite à ${MAX_PRODUCER_GENRES} styles`, () => {
		const genreIds = Array.from({ length: MAX_PRODUCER_GENRES + 1 }, (_, i) => `g${i}`);
		expect(producerProfileSchema.safeParse({ ...base, genreIds }).success).toBe(false);
	});

	it('limite la longueur des tarifs', () => {
		expect(producerProfileSchema.safeParse({ ...base, rate: 'x'.repeat(200) }).success).toBe(false);
	});

	it('signale le champ fautif d’une production', () => {
		const result = producerProfileSchema.safeParse({
			...base,
			references: [{ title: '', url: 'soundcloud.com/a' }]
		});
		expect(result.error?.issues[0].path).toEqual(['references', 0, 'title']);
	});
});
