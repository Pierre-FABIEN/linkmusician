import { describe, expect, it } from 'vitest';
import {
	commitmentMatch,
	normalizeQualification,
	payLabel,
	presenceMatch,
	qualificationSummary,
	EMPTY_QUALIFICATION
} from './qualification';
import { opportunitySchema, unknownConditions, unmetConditions } from './rules';
import { gigSlotSchema, unknownGigConditions, unmetGigConditions } from './gigSlot';

const facts = { instruments: [{ slug: 'batterie', level: 3 }], genreSlugs: ['rock'], tiers: [] };

describe('annonce qualifiée (ONB-13b, D63)', () => {
	it('engagement : « régulier » écarte « de temps en temps », jamais l’inconnu', () => {
		expect(commitmentMatch('REGULAR', 'OCCASIONAL')).toBe('no');
		expect(commitmentMatch('REGULAR', 'REGULAR')).toBe('yes');
		expect(commitmentMatch('REGULAR', 'PROFESSIONAL_PROJECT')).toBe('yes');
		expect(commitmentMatch('REGULAR', null)).toBe('unknown');
		expect(commitmentMatch('ONE_OFF', 'OCCASIONAL')).toBe('yes');
		expect(commitmentMatch(null, 'OCCASIONAL')).toBe('yes');
	});

	it('présence : à distance ou sur place, selon la mobilité déclarée', () => {
		expect(presenceMatch('REMOTE', ['REMOTE'])).toBe('yes');
		expect(presenceMatch('REMOTE', ['OWN_PLACE', 'ON_SITE'])).toBe('no');
		expect(presenceMatch('ON_SITE', ['OWN_PLACE'])).toBe('yes');
		expect(presenceMatch('ON_SITE', ['REMOTE'])).toBe('no');
		expect(presenceMatch('ON_SITE', [])).toBe('unknown');
		expect(presenceMatch(null, ['REMOTE'])).toBe('yes');
	});

	it('scénario 1 : batteur rock régulier', () => {
		const o = { instrument: 'batterie', genre: 'rock', commitment: 'REGULAR' as const };
		expect(unmetConditions(o, { ...facts, commitment: 'OCCASIONAL' })).toEqual(['commitment']);
		expect(unmetConditions(o, { ...facts, commitment: 'REGULAR' })).toEqual([]);
		// Profil sans engagement : il peut postuler, signalé « non précisé ».
		expect(unmetConditions(o, facts)).toEqual([]);
		expect(unknownConditions(o, facts)).toEqual(['commitment']);
	});

	it('scénario 2 : mixage à distance, seulement qui travaille à distance', () => {
		const o = {
			targetTrack: 'SOUND_ENGINEER',
			targetSpecialty: 'MIXING',
			presence: 'REMOTE' as const
		};
		const pro = { ...facts, tracks: ['SOUND_ENGINEER'], specialties: ['MIXING'] };
		expect(unmetConditions(o, { ...pro, mobility: ['OWN_PLACE'] })).toEqual(['presence']);
		expect(unmetConditions(o, { ...pro, mobility: ['REMOTE'] })).toEqual([]);
		expect(unknownConditions(o, { ...pro, mobility: [] })).toEqual(['presence']);
	});

	const gig = { minBandTier: null, genre: null, radiusKm: 50 };
	const band = { tier: null, genreSlugs: [], distanceKm: 10 };

	it('scénario 3 : un duo, jamais un solo', () => {
		const o = { ...gig, formation: 'DUO' as const };
		expect(unmetGigConditions(o, { ...band, formation: 'SOLO' })).toEqual(['formation']);
		expect(unmetGigConditions(o, { ...band, formation: 'DUO' })).toEqual([]);
		expect(unmetGigConditions(o, band)).toEqual([]);
		expect(unknownGigConditions(o, band)).toEqual(['formation']);
	});

	it('scénario 4 : groupe de reprises, « les deux » convient', () => {
		const o = { ...gig, repertoire: 'COVERS' as const };
		expect(unmetGigConditions(o, { ...band, repertoire: 'ORIGINALS' })).toEqual(['repertoire']);
		expect(unmetGigConditions(o, { ...band, repertoire: 'BOTH' })).toEqual([]);
		expect(unknownGigConditions(o, { ...band, repertoire: null })).toEqual(['repertoire']);
	});

	it('seules les conditions du type d’annonce sont gardées ; fourchette cohérente', () => {
		const raw = {
			pay: 'VOLUNTEER' as const,
			payMin: 100,
			payMax: 200,
			formation: 'DUO' as const,
			commitment: 'REGULAR' as const,
			presence: 'REMOTE' as const
		};
		const musicians = normalizeQualification('musicians', raw);
		expect(musicians).toEqual({
			ok: true,
			value: { ...EMPTY_QUALIFICATION, pay: 'VOLUNTEER', commitment: 'REGULAR' }
		});
		expect(normalizeQualification('craft', raw)).toMatchObject({
			value: { presence: 'REMOTE', commitment: null, formation: null }
		});
		expect(normalizeQualification('gig', { ...raw, pay: 'PAID' })).toMatchObject({
			value: { pay: 'PAID', payMinEuros: 100, payMaxEuros: 200, formation: 'DUO' }
		});
		expect(normalizeQualification('gig', { pay: 'PAID', payMin: 300, payMax: 100 })).toEqual({
			ok: false,
			message: 'La fourchette va du plus petit montant au plus grand.'
		});
	});

	it('en mots', () => {
		expect(payLabel({ pay: 'PAID', payMinEuros: 150, payMaxEuros: 300 })).toMatch(
			/^Rémunéré · 150\s€ à 300\s€$/
		);
		expect(payLabel({ pay: 'EXPENSES', payMinEuros: null, payMaxEuros: 50 })).toMatch(
			/^Défrayé · jusqu’à 50\s€$/
		);
		expect(payLabel({ pay: 'HAT', payMinEuros: null, payMaxEuros: null })).toBe('Au chapeau');
		expect(qualificationSummary({ ...EMPTY_QUALIFICATION, formation: 'DUO' })).toEqual([
			{ label: 'Formation', value: 'Duo' }
		]);
		expect(qualificationSummary(EMPTY_QUALIFICATION)).toEqual([]);
	});

	it('formulaires : champs vides acceptés, valeurs inconnues refusées', () => {
		const base = {
			kind: 'RECRUIT_MEMBER',
			title: 'Cherche batteur',
			description: 'Groupe de rock cherche batteur régulier.',
			radiusKm: '25',
			durationDays: '14',
			slots: '1'
		};
		const empty = opportunitySchema.parse({ ...base, pay: '', payMin: '', commitment: '' });
		expect(empty).toMatchObject({ pay: null, payMin: null, commitment: null });
		expect(opportunitySchema.safeParse({ ...base, pay: 'FREE_BEER' }).success).toBe(false);
		expect(opportunitySchema.parse({ ...base, pay: 'PAID', payMin: '150' }).payMin).toBe(150);
		expect(
			gigSlotSchema.safeParse({
				venueId: 'clvenue0000000000000001',
				day: '2027-01-10',
				start: '20:00',
				title: 'Soirée acoustique',
				description: 'Un duo acoustique pour ouvrir la soirée.',
				slots: '1',
				radiusKm: '50',
				formation: 'QUARTET'
			}).success
		).toBe(false);
	});
});
