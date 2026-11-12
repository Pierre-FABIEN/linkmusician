/**
 * Gabarit des métiers (D59) : invariants de tous les catalogues, puis les
 * critères d'acceptation de chaque ticket (ONB-04 à 11).
 */
import { describe, expect, it } from 'vitest';
import {
	checkFields,
	isRequired,
	trackFields,
	visibleFields,
	type TrackChoices
} from './trackFields';
import { TRACK_CATALOGS } from './catalog';
import { catalogOf } from './specializations';
import { TRACK_KINDS, TRACKS, type TrackKindValue } from './tracks';

const choices = (patch: Partial<TrackChoices> = {}): TrackChoices => ({
	specializations: [],
	offers: [],
	needs: [],
	...patch
});
const ids = (track: TrackKindValue, c: TrackChoices) => visibleFields(track, c).map((f) => f.id);

describe('invariants de tous les catalogues', () => {
	it.each(TRACK_KINDS)('%s : identifiants et codes uniques, sans point', (track) => {
		const fields = trackFields(track);
		const fieldIds = fields.map((f) => f.id);
		expect(new Set(fieldIds).size).toBe(fieldIds.length);
		for (const f of fields) {
			expect(f.id).toMatch(/^[a-z][a-z_]*$/);
			expect(f.label.trim()).not.toBe('');
			const codes = f.options.map((o) => o.code);
			expect(codes.length).toBeGreaterThan(0);
			expect(new Set(codes).size).toBe(codes.length);
			for (const c of codes) expect(c).toMatch(/^[A-Z][A-Z0-9_]*$/);
		}
	});

	it.each(TRACK_KINDS)('%s : chaque condition vise un code du métier', (track) => {
		for (const f of trackFields(track)) {
			for (const list of ['specializations', 'offers', 'needs'] as const) {
				const known = catalogOf(track, list).map((e) => e.code);
				for (const code of f.when?.[list] ?? []) expect(known, `${f.id} → ${code}`).toContain(code);
			}
		}
	});

	it.each(TRACK_KINDS.filter((t) => t !== 'MUSICIAN'))(
		'%s : a des offres et des besoins distincts',
		(track) => {
			const offers = TRACK_CATALOGS[track].offers.map((i) => i.code);
			const needs = TRACK_CATALOGS[track].needs.map((i) => i.code);
			expect(offers.length).toBeGreaterThan(0);
			expect(needs.length).toBeGreaterThan(0);
			expect(offers.filter((c) => needs.includes(c))).toEqual([]);
		}
	);

	it('n’exige rien d’un métier « bientôt » (D15)', () => {
		for (const track of TRACK_KINDS.filter((t) => !TRACKS[t].available))
			for (const f of trackFields(track)) expect(isRequired(track, f)).toBe(false);
		expect(checkFields('PUBLISHER', choices({ needs: ['FIND_AUTHORS'] }), {})).toEqual({
			ok: true,
			answers: {}
		});
	});
});

describe('checkFields', () => {
	it('garde l’ordre du catalogue et retire les champs masqués', () => {
		expect(
			checkFields('SOUND_ENGINEER', choices(), {
				environment: ['LIVE', 'REMOTE'],
				mixing_format: ['STEREO']
			})
		).toEqual({ ok: true, answers: { environment: ['REMOTE', 'LIVE'] } });
	});

	it('refuse un champ inconnu, un code inconnu, deux valeurs pour un choix unique', () => {
		expect(checkFields('SOUND_ENGINEER', choices(), { colour: ['RED'] })).toMatchObject({
			ok: false,
			field: 'colour'
		});
		expect(checkFields('SOUND_ENGINEER', choices(), { environment: ['MOON'] })).toMatchObject({
			ok: false,
			field: 'environment'
		});
		expect(
			checkFields('MANAGER', choices(), {
				status: ['INDEPENDENT', 'OTHER'],
				territory: ['LOCAL'],
				accepts_projects: ['YES']
			})
		).toMatchObject({ ok: false, message: 'Un seul choix possible.' });
	});

	it('exige un champ requis visible', () => {
		expect(checkFields('SOUND_ENGINEER', choices(), {})).toMatchObject({
			ok: false,
			field: 'environment',
			message: 'Ce champ est requis.'
		});
	});
});

describe('ingé son (ONB-04)', () => {
	it('« Mixage + Façade » montre les deux blocs, sans doublon', () => {
		const shown = ids('SOUND_ENGINEER', choices({ specializations: ['MIXING', 'LIVE_FOH'] }));
		expect(shown).toEqual(expect.arrayContaining(['mixing_format', 'live_venues', 'daw']));
		expect(new Set(shown).size).toBe(shown.length);
		expect(shown).not.toContain('mastering_targets');
	});

	it('une spécialité exercée n’ajoute aucune offre : les deux listes sont indépendantes', () => {
		const offered = TRACK_CATALOGS.SOUND_ENGINEER.offers.map((o) => o.code);
		const specs = catalogOf('SOUND_ENGINEER', 'specializations').map((e) => e.code);
		expect(offered.filter((c) => specs.includes(c))).toEqual([]);
	});
});

describe('producteur·rice (ONB-05)', () => {
	it('beatmaking : formats et souhaits, sans contrat', () => {
		expect(ids('PRODUCER', choices({ specializations: ['BEATMAKING'] }))).toEqual([
			'environment',
			'beat_formats',
			'beat_terms'
		]);
	});
});

describe('manager (ONB-06)', () => {
	const base = { status: ['INDEPENDENT'], territory: ['REGIONAL'], accepts_projects: ['YES'] };

	it('« Tour management » ne demande pas d’artiste à recruter', () => {
		const tour = choices({ specializations: ['TOUR_MANAGEMENT'] });
		expect(ids('MANAGER', tour)).not.toContain('target_stage');
		expect(checkFields('MANAGER', tour, base)).toMatchObject({ ok: true });
	});

	it('chercher des artistes exige le stade ciblé', () => {
		const prospect = choices({ needs: ['FIND_EMERGING_ARTISTS'] });
		expect(checkFields('MANAGER', prospect, base)).toMatchObject({
			ok: false,
			field: 'target_stage'
		});
		expect(checkFields('MANAGER', prospect, { ...base, target_stage: ['EMERGING'] })).toMatchObject(
			{ ok: true }
		);
	});
});

describe('booker / programmateur·rice (ONB-07)', () => {
	it('booker et programmateur·rice ont des questions différentes, et peuvent coexister', () => {
		const booker = ids('BOOKER', choices({ specializations: ['ARTIST_BOOKING'] }));
		const programmer = ids('BOOKER', choices({ specializations: ['PROGRAMMING'] }));
		expect(booker).toContain('artist_categories');
		expect(booker).not.toContain('programming_capacity');
		expect(programmer).toContain('programming_capacity');
		expect(programmer).not.toContain('artist_categories');
		const both = ids('BOOKER', choices({ specializations: ['ARTIST_BOOKING', 'PROGRAMMING'] }));
		expect(both).toEqual(expect.arrayContaining(['artist_categories', 'programming_capacity']));
	});
});

describe('organisateur·rice (ONB-08)', () => {
	it('jam et festival affichent leurs blocs ; aucun champ de date', () => {
		const shown = ids('PROMOTER', choices({ specializations: ['OPEN_STAGES', 'FESTIVAL'] }));
		expect(shown).toEqual(expect.arrayContaining(['jam_format', 'festival_stages']));
		expect(shown).not.toContain('concert_lineup');
		for (const f of trackFields('PROMOTER')) expect(f.id).not.toMatch(/date/);
	});
});

describe('label (ONB-09)', () => {
	it('l’A&R donne sa politique de démos ; le catalogue n’est pas forcé de chercher', () => {
		expect(ids('LABEL_PRO', choices({ specializations: ['A_AND_R'] }))).toContain('demo_policy');
		expect(ids('LABEL_PRO', choices({ specializations: ['CATALOG'] }))).toEqual(['territory']);
	});
});

describe('éditeur·rice (ONB-10)', () => {
	it('les soumissions ne se demandent qu’à qui cherche des œuvres ou des auteur·rices', () => {
		expect(ids('PUBLISHER', choices({ needs: ['FIND_SYNC'] }))).not.toContain('submissions');
		expect(ids('PUBLISHER', choices({ needs: ['FIND_WORKS'] }))).toContain('submissions');
	});
});

describe('communication (ONB-11)', () => {
	it('le journaliste voit les questions éditoriales, le CM les plateformes', () => {
		const journalist = ids('MUSIC_COMMS', choices({ specializations: ['JOURNALISM'] }));
		const cm = ids('MUSIC_COMMS', choices({ specializations: ['COMMUNITY_MANAGEMENT'] }));
		expect(journalist).toEqual(expect.arrayContaining(['coverage_kind', 'journalism_formats']));
		expect(journalist).not.toContain('platforms');
		expect(cm).toContain('platforms');
		expect(cm).not.toContain('journalism_formats');
	});

	it('le graphisme (ONB-12a) ouvre ses supports, sans les questions photo-vidéo', () => {
		const graphic = ids('MUSIC_COMMS', choices({ specializations: ['GRAPHIC_DESIGN'] }));
		expect(graphic).toContain('graphic_media');
		expect(graphic).not.toContain('visual_formats');
		expect(ids('MUSIC_COMMS', choices({ specializations: ['PHOTO'] }))).not.toContain(
			'graphic_media'
		);
	});
});
