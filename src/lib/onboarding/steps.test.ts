import { describe, expect, it } from 'vitest';
import { canVisit, currentStep, stepNumber, stepPath, type OnboardingState } from './steps';

const done: OnboardingState = {
	hasTracks: true,
	instrumentCount: 1,
	genreCount: 2,
	hasZone: true,
	onboarded: true
};

describe('étape d’onboarding déduite du profil', () => {
	it.each([
		[{ hasTracks: false }, 'metiers'],
		[{ instrumentCount: 0 }, 'instruments'],
		[{ genreCount: 0 }, 'genres'],
		[{ hasZone: false }, 'ville'],
		[{ onboarded: false }, 'intention'],
		[{}, null]
	] as const)('%o → %s', (patch, step) => {
		expect(currentStep({ ...done, ...patch })).toBe(step);
	});

	it('reprend à la première étape manquante, même si une suivante est faite', () => {
		expect(currentStep({ ...done, instrumentCount: 0, onboarded: false })).toBe('instruments');
	});

	it('numérote les 6 écrans et donne leur adresse', () => {
		expect(stepNumber('metiers')).toBe(1);
		expect(stepNumber('resultat')).toBe(6);
		expect(stepPath('ville')).toBe('/demarrer/ville');
	});

	it('ouvre les étapes faites et la courante, pas les suivantes', () => {
		const atGenres = { ...done, genreCount: 0, hasZone: false, onboarded: false };
		expect(canVisit('instruments', atGenres)).toBe(true);
		expect(canVisit('genres', atGenres)).toBe(true);
		expect(canVisit('ville', atGenres)).toBe(false);
		expect(canVisit('resultat', atGenres)).toBe(false);
		expect(canVisit('resultat', done)).toBe(true);
	});
});
