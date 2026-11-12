import { describe, expect, it } from 'vitest';
import {
	catalogOf,
	checkCodes,
	findSpecialization,
	INTENTS,
	parseTrackDetails,
	selectableSpecializations,
	serializeTrackDetails,
	SPECIALIZATIONS,
	type TrackDetails
} from './specializations';
import { TRACK_KINDS, TRACKS } from './tracks';
import { SOUND_SPECIALTIES, SOUND_SPECIALTY_INFO } from '#lib/crafts/sound';
import { PRODUCER_SPECIALTIES } from '#lib/crafts/producer';
import { PROMOTER_EVENT_KINDS } from '#lib/crafts/promoter';
import { trackDetailsSchema, tracksDetailsSchema } from '#lib/schema/actors/trackDetailsSchema';

const normalize = (s: string) =>
	s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]/g, '');

describe('référentiel des spécialités', () => {
	it('décrit chaque métier, avec au moins deux spécialités', () => {
		for (const track of TRACK_KINDS) {
			expect(SPECIALIZATIONS[track].length).toBeGreaterThanOrEqual(2);
			for (const s of SPECIALIZATIONS[track]) {
				expect(s.track).toBe(track);
				expect(s.code).toMatch(/^[A-Z][A-Z0-9_]*$/);
				expect(s.label.trim()).not.toBe('');
				expect(s.description.trim()).not.toBe('');
			}
		}
	});

	it('a des codes et des libellés uniques dans chaque métier (pas de synonymes en double)', () => {
		for (const track of TRACK_KINDS) {
			const codes = SPECIALIZATIONS[track].map((s) => s.code);
			const labels = SPECIALIZATIONS[track].map((s) => normalize(s.label));
			expect(new Set(codes).size).toBe(codes.length);
			expect(new Set(labels).size).toBe(labels.length);
		}
	});

	it('reprend à l’identique les codes et libellés déjà en base', () => {
		const legacyCodes = (track: (typeof TRACK_KINDS)[number]) =>
			SPECIALIZATIONS[track].filter((s) => s.legacy).map((s) => s.code);
		expect(legacyCodes('SOUND_ENGINEER').sort()).toEqual([...SOUND_SPECIALTIES].sort());
		expect(legacyCodes('PRODUCER').sort()).toEqual([...PRODUCER_SPECIALTIES].sort());
		expect(legacyCodes('PROMOTER').sort()).toEqual([...PROMOTER_EVENT_KINDS].sort());
		for (const track of TRACK_KINDS) {
			if (!['SOUND_ENGINEER', 'PRODUCER', 'PROMOTER'].includes(track))
				expect(legacyCodes(track)).toEqual([]);
		}
		expect(findSpecialization('SOUND_ENGINEER', 'MIXING')?.label).toBe(
			SOUND_SPECIALTY_INFO.MIXING.label
		);
	});

	it('suit le statut du métier (D15) sans en ouvrir aucun', () => {
		for (const track of TRACK_KINDS) {
			const expected = TRACKS[track].available ? 'active' : 'soon';
			for (const s of SPECIALIZATIONS[track].filter((x) => x.status !== 'retired'))
				expect(s.status).toBe(expected);
		}
		// MANAGER est ouvert depuis P5-07 ; PUBLISHER reste fermé jusqu'à P6-03.
		expect(findSpecialization('MANAGER', 'TOUR_MANAGEMENT')?.status).toBe('active');
		expect(SPECIALIZATIONS.PUBLISHER.every((s) => s.status === 'soon')).toBe(true);
	});

	it('musicien·ne : retire instrument, voix et DJ (doublons des instruments), garde l’écriture (Q54)', () => {
		const retired = SPECIALIZATIONS.MUSICIAN.filter((s) => s.status === 'retired');
		expect(retired.map((s) => s.code)).toContain('GUITARIST');
		expect(retired.map((s) => s.code)).toContain('DJ');
		expect(retired.every((s) => s.group !== 'role' || s.code === 'DJ')).toBe(true);
		expect(selectableSpecializations('MUSICIAN').map((s) => s.code)).toEqual([
			'COMPOSER',
			'LYRICIST',
			'ARRANGER'
		]);
	});

	it('distingue instrument, voix et profession chez les musicien·nes, et seulement chez eux', () => {
		const groups = new Set(SPECIALIZATIONS.MUSICIAN.map((s) => s.group));
		expect(groups).toEqual(new Set(['instrument', 'voice', 'role']));
		for (const track of TRACK_KINDS.filter((t) => t !== 'MUSICIAN'))
			for (const s of SPECIALIZATIONS[track]) expect(s.group).toBeNull();
	});

	it('identifie une spécialité par son métier', () => {
		expect(findSpecialization('PRODUCER', 'ARRANGEMENT')).not.toBeNull();
		expect(findSpecialization('MUSICIAN', 'ARRANGEMENT')).toBeNull();
		expect(findSpecialization('SOUND_ENGINEER', 'BEATMAKING')).toBeNull();
	});

	it('garde des catalogues « Je propose » et « Je recherche » séparés, aux codes distincts', () => {
		for (const track of TRACK_KINDS) {
			const offers = INTENTS[track].OFFER.map((i) => i.code);
			const needs = INTENTS[track].NEED.map((i) => i.code);
			expect(new Set(offers).size).toBe(offers.length);
			expect(new Set(needs).size).toBe(needs.length);
			expect(offers.filter((c) => needs.includes(c))).toEqual([]);
			for (const i of [...INTENTS[track].OFFER, ...INTENTS[track].NEED]) {
				expect(i.code).toMatch(/^[A-Z][A-Z0-9_]*$/);
				expect(i.label.trim()).not.toBe('');
			}
		}
		expect(INTENTS.MUSICIAN.OFFER.length).toBeGreaterThan(0);
		expect(INTENTS.MUSICIAN.NEED.length).toBeGreaterThan(0);
	});

	it('ne propose que les spécialités non retirées', () => {
		expect(selectableSpecializations('SOUND_ENGINEER').map((s) => s.code)).toEqual(
			SPECIALIZATIONS.SOUND_ENGINEER.map((s) => s.code)
		);
	});
});

describe('checkCodes', () => {
	it('retire les doublons et remet l’ordre du catalogue', () => {
		expect(
			checkCodes('SOUND_ENGINEER', 'specializations', ['RF', 'MIXING', 'RF', 'RECORDING'])
		).toEqual({ ok: true, codes: ['RECORDING', 'MIXING', 'RF'] });
	});

	it('accepte une liste vide', () => {
		expect(checkCodes('MUSICIAN', 'specializations', [])).toEqual({ ok: true, codes: [] });
	});

	it('refuse un code inconnu ou d’un autre métier', () => {
		expect(checkCodes('SOUND_ENGINEER', 'specializations', ['MIXING', 'BEATMAKING'])).toEqual({
			ok: false,
			reason: 'unknown',
			code: 'BEATMAKING'
		});
		expect(checkCodes('PRODUCER', 'specializations', ['mixing'])).toMatchObject({ ok: false });
		expect(checkCodes('MUSICIAN', 'offers', ['GUITARIST'])).toMatchObject({
			ok: false,
			reason: 'unknown'
		});
	});
});

describe('repli quand une spécialité est retirée du catalogue', () => {
	// Catalogue simulé : on retire RF de l'entrée réelle, sans toucher au module.
	const original = SPECIALIZATIONS.SOUND_ENGINEER;
	const withRetired = () => {
		(SPECIALIZATIONS as Record<string, unknown>).SOUND_ENGINEER = original.map((s) =>
			s.code === 'RF' ? { ...s, status: 'retired' } : s
		);
	};
	const restore = () => {
		(SPECIALIZATIONS as Record<string, unknown>).SOUND_ENGINEER = original;
	};

	it('la conserve chez qui l’avait, même si le formulaire ne la renvoie plus', () => {
		withRetired();
		try {
			expect(checkCodes('SOUND_ENGINEER', 'specializations', ['MIXING'], ['RF'])).toEqual({
				ok: true,
				codes: ['MIXING', 'RF']
			});
			expect(selectableSpecializations('SOUND_ENGINEER').map((s) => s.code)).not.toContain('RF');
			expect(catalogOf('SOUND_ENGINEER', 'specializations').map((e) => e.code)).toContain('RF');
		} finally {
			restore();
		}
	});

	it('refuse de l’ajouter à qui ne l’avait pas', () => {
		withRetired();
		try {
			expect(checkCodes('SOUND_ENGINEER', 'specializations', ['RF'])).toEqual({
				ok: false,
				reason: 'retired',
				code: 'RF'
			});
		} finally {
			restore();
		}
	});
});

describe('sérialisation', () => {
	const details: TrackDetails[] = [
		{
			track: 'PRODUCER',
			specializations: ['BEATMAKING', 'RECORD_PRODUCTION', 'TOPLINE'],
			offers: [],
			needs: []
		},
		{ track: 'MUSICIAN', specializations: ['SINGER', 'GUITARIST'], offers: [], needs: [] },
		{ track: 'SOUND_ENGINEER', specializations: ['LIVE_FOH', 'MIXING'], offers: [], needs: [] }
	];

	it('relit exactement 2+ métiers avec 2+ spécialités chacun (ordre du catalogue)', () => {
		const rows = serializeTrackDetails(details);
		expect(rows.map((r) => r.track)).toEqual([
			'MUSICIAN',
			'MUSICIAN',
			'PRODUCER',
			'PRODUCER',
			'PRODUCER',
			'SOUND_ENGINEER',
			'SOUND_ENGINEER'
		]);
		const back = parseTrackDetails(
			details.map((d) => d.track),
			rows
		);
		expect(back).toEqual([
			{ track: 'MUSICIAN', specializations: ['GUITARIST', 'SINGER'], offers: [], needs: [] },
			{
				track: 'PRODUCER',
				specializations: ['RECORD_PRODUCTION', 'BEATMAKING', 'TOPLINE'],
				offers: [],
				needs: []
			},
			{ track: 'SOUND_ENGINEER', specializations: ['MIXING', 'LIVE_FOH'], offers: [], needs: [] }
		]);
		expect(serializeTrackDetails(back)).toEqual(rows);
	});

	it('ignore à la lecture un code inconnu et les métiers non demandés', () => {
		const back = parseTrackDetails(
			['SOUND_ENGINEER'],
			[
				{ track: 'SOUND_ENGINEER', list: 'specializations', code: 'MIXING' },
				{ track: 'SOUND_ENGINEER', list: 'specializations', code: 'DISPARU' },
				{ track: 'PRODUCER', list: 'specializations', code: 'BEATMAKING' }
			]
		);
		expect(back).toEqual([
			{ track: 'SOUND_ENGINEER', specializations: ['MIXING'], offers: [], needs: [] }
		]);
	});

	it('rend un métier sans aucune sélection', () => {
		expect(parseTrackDetails(['MANAGER'], [])).toEqual([
			{ track: 'MANAGER', specializations: [], offers: [], needs: [] }
		]);
	});
});

describe('trackDetailsSchema', () => {
	it('accepte une sélection valide', () => {
		const result = trackDetailsSchema.safeParse({
			track: 'PROMOTER',
			specializations: ['CONTEST', 'OPEN_STAGES']
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toMatchObject({ offers: [], needs: [] });
	});

	it('signale le code invalide à sa place', () => {
		const result = trackDetailsSchema.safeParse({
			track: 'PROMOTER',
			specializations: ['CONCERTS', 'MIXING']
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].path).toEqual(['specializations', 1]);
			expect(result.error.issues[0].message).toBe('Ce choix n’existe pas pour ce métier.');
		}
	});

	it('refuse un métier inconnu et une liste trop longue', () => {
		expect(trackDetailsSchema.safeParse({ track: 'CHEF' }).success).toBe(false);
		expect(
			trackDetailsSchema.safeParse({ track: 'MUSICIAN', specializations: Array(31).fill('DJ') })
				.success
		).toBe(false);
	});

	it('refuse un métier présent deux fois', () => {
		const result = tracksDetailsSchema.safeParse([
			{ track: 'MUSICIAN', specializations: ['DJ'] },
			{ track: 'MUSICIAN', specializations: ['COMPOSER'] }
		]);
		expect(result.success).toBe(false);
	});
});
