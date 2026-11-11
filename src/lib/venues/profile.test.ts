import { describe, expect, it } from 'vitest';
import { publicationGaps, venueProfileSchema, venueQuests } from './profile';

describe('fiche d’un lieu (P5-03b)', () => {
	it('normalise la saisie : jauge, scène, conditions et jours dans l’ordre', () => {
		const parsed = venueProfileSchema.parse({
			capacity: ' 80 ',
			stage: '  Petite scène   en bois\n\n Sono 2 x 500 W ',
			conditions: ['HAT', 'FEE', 'HAT'],
			days: ['5', '4', '5'],
			ageRule: 'DAYTIME_MINORS',
			genreIds: ['a', 'a']
		});
		expect(parsed).toEqual({
			capacity: 80,
			stage: 'Petite scène en bois\nSono 2 x 500 W',
			conditions: ['FEE', 'HAT'],
			days: [4, 5],
			ageRule: 'DAYTIME_MINORS',
			genreIds: ['a']
		});
	});

	it('refuse une jauge nulle, un jour inventé, une règle d’âge inconnue', () => {
		const base = { conditions: [], days: [], ageRule: 'ALL_AGES', genreIds: [] };
		expect(venueProfileSchema.safeParse({ ...base, capacity: '0' }).success).toBe(false);
		expect(venueProfileSchema.safeParse({ ...base, days: ['8'] }).success).toBe(false);
		expect(venueProfileSchema.safeParse({ ...base, ageRule: 'TOUT' }).success).toBe(false);
	});

	it('dit ce qui manque pour publier', () => {
		expect(publicationGaps({ capacity: null, stage: '', conditions: [], genres: 0 })).toEqual([
			'la jauge',
			'la scène et le son',
			'un genre au moins',
			'les conditions faites aux artistes'
		]);
		expect(
			publicationGaps({ capacity: 80, stage: 'Sono', conditions: ['HAT'], genres: 1 })
		).toEqual([]);
	});

	it('les quêtes suivent les faits, jamais l’XP', () => {
		const quests = venueQuests(
			{ published: true, gigSlots: 1, bandsProgrammed: 0, publicJams: 0, firstDates: 0 },
			'v1'
		);
		expect(quests.filter((q) => q.done).map((q) => q.id)).toEqual(['venue.fiche', 'venue.date']);
		expect(quests.find((q) => q.id === 'venue.date')?.href).toBe('/plateaux/nouveau?lieu=v1');
	});
});
