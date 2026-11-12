import { describe, expect, it } from 'vitest';
import { DEFAULT_RADIUS, MAX_PAGE, filtersToParams, parseFilters } from './filters';

const parse = (query: string) => parseFilters(new URLSearchParams(query));

describe('filtres de recherche (P2-01)', () => {
	it('sans paramètre : valeurs par défaut', () => {
		expect(parse('')).toEqual({
			track: null,
			specialty: null,
			offer: null,
			remote: false,
			references: false,
			instrument: null,
			minLevel: null,
			genre: null,
			radius: DEFAULT_RADIUS,
			lookingFor: null,
			proStatus: null,
			reciprocal: false,
			page: 1
		});
	});

	it('lit des filtres valides', () => {
		expect(
			parse(
				'instrument=batterie&niveau=3&genre=funk&rayon=10&recherche=JAMS&statut=SEMI_PRO&reciproque=1&page=2'
			)
		).toEqual({
			track: null,
			specialty: null,
			offer: null,
			remote: false,
			references: false,
			instrument: 'batterie',
			minLevel: 3,
			genre: 'funk',
			radius: 10,
			lookingFor: 'JAMS',
			proStatus: 'SEMI_PRO',
			reciprocal: true,
			page: 2
		});
	});

	it.each([
		['instrument=Batterie', { instrument: 'batterie' }],
		["instrument=bat'; drop", { instrument: null }],
		['niveau=9', { minLevel: null }],
		['rayon=7', { radius: DEFAULT_RADIUS }],
		['recherche=NIMPORTE', { lookingFor: null }],
		['statut=ROCKSTAR', { proStatus: null }],
		['reciproque=oui', { reciprocal: false }],
		[`page=${MAX_PAGE + 1}`, { page: 1 }],
		['page=-2', { page: 1 }],
		['metier=editeur', { track: null }],
		['metier=constructor', { track: null }],
		['specialite=mixage', { specialty: null }],
		['metier=inge-son&specialite=cuisine', { track: 'SOUND_ENGINEER', specialty: null }]
	])('valeur invalide ignorée : %s', (query, expected) => {
		expect(parse(query)).toMatchObject(expected);
	});

	it('aller-retour URL, défauts omis', () => {
		const query = 'instrument=basse&niveau=4&rayon=50&reciproque=1';
		expect(filtersToParams(parse(query)).toString()).toBe(query);
		expect(filtersToParams(parse('rayon=25&page=1')).toString()).toBe('');
	});

	it('métier et spécialité (P4-02)', () => {
		expect(parse('metier=inge-son&specialite=mixage')).toMatchObject({
			track: 'SOUND_ENGINEER',
			specialty: 'MIXING'
		});
		expect(parse('metier=musicien')).toMatchObject({ track: 'MUSICIAN', specialty: null });
		expect(parse('metier=producteur&specialite=beatmaking')).toMatchObject({
			track: 'PRODUCER',
			specialty: 'BEATMAKING'
		});
		// Une spécialité d'un autre métier est ignorée.
		expect(parse('metier=producteur&specialite=mixage').specialty).toBeNull();
		// Organisateur·rice (P5-05a) : ce qu'elle ou il organise.
		expect(parse('metier=organisateur&specialite=scenes-ouvertes')).toMatchObject({
			track: 'PROMOTER',
			specialty: 'OPEN_STAGES'
		});
		expect(parse('metier=organisateur&specialite=mixage').specialty).toBeNull();
		// Manager et booker (P5-07) : sans spécialité.
		expect(parse('metier=booker')).toMatchObject({ track: 'BOOKER', specialty: null });
		expect(parse('metier=manager&specialite=mixage')).toMatchObject({
			track: 'MANAGER',
			specialty: null
		});
		const query = 'metier=inge-son&specialite=facade&rayon=50';
		expect(filtersToParams(parse(query)).toString()).toBe(query);
	});

	it('ce que la personne propose, à distance, avec références (ONB-13a)', () => {
		const f = parse('metier=inge-son&propose=mixing-service&a-distance=1&references=1');
		expect(f).toMatchObject({
			track: 'SOUND_ENGINEER',
			offer: 'MIXING_SERVICE',
			remote: true,
			references: true
		});
		expect(filtersToParams(f).toString()).toBe(
			'metier=inge-son&propose=mixing-service&a-distance=1&references=1'
		);
		// Une offre d'un autre métier, ou sans métier, est ignorée.
		expect(parse('metier=inge-son&propose=concert-dates').offer).toBeNull();
		expect(parse('propose=mixing-service').offer).toBeNull();
		// « À distance » n'a de sens que pour l'ingé son et le producteur·rice.
		expect(parse('metier=organisateur&a-distance=1&references=1')).toMatchObject({
			remote: false,
			references: false
		});
	});
});
