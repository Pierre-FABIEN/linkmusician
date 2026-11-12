import { describe, expect, it } from 'vitest';
import {
	canVisit,
	currentStep,
	minSpecializations,
	onboardingSteps,
	readyToFinish,
	stepNumber,
	stepPath,
	trackOfSlug,
	type OnboardingState
} from './steps';
import { TRACK_KINDS } from '#lib/actors/tracks';
import { TRACK_ROLES } from '#lib/actors/roles';

const musician: OnboardingState = {
	tracks: ['MUSICIAN'],
	primary: 'MUSICIAN',
	confirmedTracks: [],
	instrumentCount: 1,
	genreCount: 2,
	hasZone: true,
	onboarded: true
};

const ids = (s: OnboardingState) => onboardingSteps(s).map((x) => x.id);

describe('parcours musicien·ne : les 6 écrans d’origine', () => {
	it('garde l’ordre et les adresses', () => {
		expect(ids(musician)).toEqual([
			'metiers',
			'instruments',
			'genres',
			'ville',
			'intention',
			'resultat'
		]);
		expect(onboardingSteps(musician).map((s) => s.path)).toEqual([
			'/qui-es-tu',
			'/demarrer/instruments',
			'/demarrer/genres',
			'/demarrer/ville',
			'/demarrer/intention',
			'/demarrer/resultat'
		]);
	});

	it('sans métier encore choisi, montre ce même parcours', () => {
		expect(ids({ ...musician, tracks: [], primary: null })).toHaveLength(6);
	});

	it.each([
		[{ tracks: [], primary: null }, 'metiers'],
		[{ instrumentCount: 0 }, 'instruments'],
		[{ genreCount: 0 }, 'genres'],
		[{ hasZone: false }, 'ville'],
		[{ onboarded: false }, 'intention'],
		[{}, null]
	] as const)('%o → %s', (patch, step) => {
		expect(currentStep({ ...musician, ...patch })).toBe(step);
	});

	it('reprend à la première étape manquante, même si une suivante est faite', () => {
		expect(currentStep({ ...musician, instrumentCount: 0, onboarded: false })).toBe('instruments');
	});

	it('ouvre les étapes faites et la courante, pas les suivantes', () => {
		const atGenres = { ...musician, genreCount: 0, hasZone: false, onboarded: false };
		expect(canVisit('instruments', atGenres)).toBe(true);
		expect(canVisit('genres', atGenres)).toBe(true);
		expect(canVisit('ville', atGenres)).toBe(false);
		expect(canVisit('resultat', atGenres)).toBe(false);
		expect(canVisit('resultat', musician)).toBe(true);
	});
});

describe('ingé son seul·e', () => {
	const sound: OnboardingState = {
		...musician,
		tracks: ['SOUND_ENGINEER'],
		primary: 'SOUND_ENGINEER',
		instrumentCount: 0,
		onboarded: false
	};

	it('ne demande ni instrument ni intention de musicien·ne', () => {
		expect(ids(sound)).toEqual(['metiers', 'genres', 'ville', 'metier:SOUND_ENGINEER', 'resultat']);
		expect(stepPath('metier:SOUND_ENGINEER')).toBe('/demarrer/metier/inge-son');
		expect(canVisit('instruments', sound)).toBe(false);
	});

	it('termine après l’étape de son métier', () => {
		expect(currentStep(sound)).toBe('metier:SOUND_ENGINEER');
		expect(readyToFinish(sound)).toBe(false);
		const confirmed = { ...sound, confirmedTracks: ['SOUND_ENGINEER' as const] };
		expect(currentStep(confirmed)).toBeNull();
		expect(readyToFinish(confirmed)).toBe(true);
		expect(readyToFinish({ ...confirmed, onboarded: true })).toBe(false);
	});
});

describe('plusieurs métiers', () => {
	const both: OnboardingState = {
		...musician,
		tracks: ['MUSICIAN', 'PRODUCER'],
		onboarded: false
	};

	it('musicien·ne + producteur·rice : une étape par métier, sans doublon', () => {
		expect(ids(both)).toEqual([
			'metiers',
			'instruments',
			'genres',
			'ville',
			'metier:PRODUCER',
			'intention',
			'resultat'
		]);
		expect(currentStep(both)).toBe('metier:PRODUCER');
		expect(canVisit('intention', both)).toBe(false);
		expect(currentStep({ ...both, confirmedTracks: ['PRODUCER'] })).toBe('intention');
		// L'intention finit l'onboarding : rien à terminer de plus.
		expect(readyToFinish({ ...both, confirmedTracks: ['PRODUCER'] })).toBe(false);
	});

	it('le métier principal passe en premier, puis l’ordre du référentiel', () => {
		const three = {
			...both,
			tracks: ['MUSICIAN', 'PROMOTER', 'SOUND_ENGINEER', 'PRODUCER'] as const,
			primary: 'PROMOTER' as const
		};
		expect(ids(three).filter((id) => id.startsWith('metier:'))).toEqual([
			'metier:PROMOTER',
			'metier:PRODUCER',
			'metier:SOUND_ENGINEER'
		]);
	});

	it('un métier ajouté en cours de route ajoute son étape, un métier retiré la retire', () => {
		const added = { ...both, tracks: [...both.tracks, 'BOOKER' as const] };
		expect(stepNumber('metier:BOOKER', added)).toBe(6);
		const removed = { ...both, tracks: ['PRODUCER' as const], primary: 'PRODUCER' as const };
		expect(stepNumber('instruments', removed)).toBe(0);
		expect(canVisit('metier:BOOKER', both)).toBe(false);
	});

	it('retirer le métier musicien·ne avant l’intention permet de terminer', () => {
		const left: OnboardingState = {
			...both,
			tracks: ['PRODUCER'],
			primary: 'PRODUCER',
			confirmedTracks: ['PRODUCER']
		};
		expect(readyToFinish(left)).toBe(true);
	});
});

describe('règles des étapes métier', () => {
	it('une spécialité pour un métier ouvert, rien pour un métier « bientôt »', () => {
		expect(minSpecializations('SOUND_ENGINEER')).toBe(1);
		expect(minSpecializations('MANAGER')).toBe(1);
		expect(minSpecializations('PUBLISHER')).toBe(0);
	});

	it('a une adresse unique et relisible par métier', () => {
		const slugs = TRACK_KINDS.map((t) => TRACK_ROLES[t].slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const t of TRACK_KINDS) expect(trackOfSlug(TRACK_ROLES[t].slug)).toBe(t);
		expect(trackOfSlug('cuisine')).toBeNull();
	});
});
