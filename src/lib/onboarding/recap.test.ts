import { describe, expect, it } from 'vitest';
import { recapSections, type RecapInput } from './recap';
import { onboardingSteps, type OnboardingState } from './steps';

const state = (tracks: OnboardingState['tracks'], primary = tracks[0]): OnboardingState => ({
	tracks,
	primary,
	confirmedTracks: [...tracks],
	instrumentCount: 1,
	genreCount: 1,
	hasZone: true,
	onboarded: false
});

const base: RecapInput = {
	tracks: [{ track: 'MUSICIAN', isPrimary: true }],
	instruments: [{ name: 'Guitare électrique', level: 3, isPrimary: true }],
	genres: ['Rock', 'Blues'],
	commune: 'Toulouse',
	radiusKm: 30,
	musician: {
		practiceExperience: 'STAGE',
		commitment: 'REGULAR',
		specializations: [],
		offers: ['PLAY_JAMS'],
		needs: ['FIND_JAMS'],
		answers: { guitar_role: ['RHYTHM'] }
	},
	details: {}
};

const line = (sections: ReturnType<typeof recapSections>, id: string, label: string) =>
	sections.find((s) => s.id === id)?.lines.find((l) => l.label === label)?.values;

describe('récapitulatif de l’onboarding', () => {
	it('une section par étape à remplir, dans l’ordre, chacune avec son lien', () => {
		const sections = recapSections(onboardingSteps(state(['MUSICIAN'])), base);
		expect(sections.map((s) => s.id)).toEqual([
			'metiers',
			'instruments',
			'genres',
			'ville',
			'intention'
		]);
		expect(sections.map((s) => s.editPath)).toEqual([
			'/qui-es-tu',
			'/demarrer/instruments',
			'/demarrer/genres',
			'/demarrer/ville',
			'/demarrer/intention'
		]);
	});

	it('musicien·ne : libellés, niveau déclaré, ville et rayon', () => {
		const sections = recapSections(onboardingSteps(state(['MUSICIAN'])), base);
		expect(line(sections, 'metiers', 'Métiers')).toEqual(['Musicien·ne (principal)']);
		expect(line(sections, 'instruments', 'Instruments')).toEqual([
			'Guitare électrique, confirmé (déclaré), principal'
		]);
		expect(line(sections, 'ville', 'Ville')).toEqual(['Toulouse, jusqu’à 30 km']);
		expect(line(sections, 'intention', 'Expérience')).toEqual(['Sur scène']);
		expect(line(sections, 'intention', 'Je propose')?.length).toBe(1);
		expect(sections.find((s) => s.id === 'intention')?.title).toBe('Musicien·ne');
	});

	it('ingé son seul·e : aucune section d’instrument ni de musicien·ne', () => {
		const input: RecapInput = {
			...base,
			tracks: [{ track: 'SOUND_ENGINEER', isPrimary: true }],
			instruments: [],
			details: {
				SOUND_ENGINEER: {
					specializations: ['MIXING', 'LIVE_FOH'],
					offers: ['MIXING_SERVICE'],
					needs: ['FIND_ARTISTS'],
					answers: { environment: ['HOME_STUDIO'], mixing_format: ['STEREO'] }
				}
			}
		};
		const sections = recapSections(onboardingSteps(state(['SOUND_ENGINEER'])), input);
		expect(sections.map((s) => s.id)).toEqual([
			'metiers',
			'genres',
			'ville',
			'metier:SOUND_ENGINEER'
		]);
		expect(line(sections, 'metier:SOUND_ENGINEER', 'Spécialités')).toEqual(['Mixage', 'Façade']);
		expect(line(sections, 'metier:SOUND_ENGINEER', 'Je propose')).toEqual(['Mixer']);
		expect(line(sections, 'metier:SOUND_ENGINEER', 'Où tu travailles')).toEqual(['Home studio']);
		expect(line(sections, 'metier:SOUND_ENGINEER', 'Mixage : formats')).toEqual(['Stéréo']);
	});

	it('trois métiers : trois ensembles distincts d’offres et de besoins', () => {
		const input: RecapInput = {
			...base,
			tracks: [
				{ track: 'PRODUCER', isPrimary: true },
				{ track: 'MUSICIAN', isPrimary: false },
				{ track: 'MANAGER', isPrimary: false }
			],
			details: {
				PRODUCER: { specializations: [], offers: [], needs: [], answers: {} },
				MANAGER: { specializations: [], offers: [], needs: [], answers: {} }
			}
		};
		const sections = recapSections(
			onboardingSteps(state(['MUSICIAN', 'PRODUCER', 'MANAGER'], 'PRODUCER')),
			input
		);
		const withIntents = sections.filter((s) => s.lines.some((l) => l.label === 'Je propose'));
		expect(withIntents.map((s) => s.id)).toEqual([
			'metier:PRODUCER',
			'metier:MANAGER',
			'intention'
		]);
		// Rien déclaré : la ligne reste, vide (« Non renseigné » à l'écran).
		expect(line(sections, 'metier:MANAGER', 'Je recherche')).toEqual([]);
	});

	it('ignore un code inconnu ou retiré du catalogue, signale un métier « bientôt »', () => {
		const input: RecapInput = {
			...base,
			tracks: [{ track: 'PUBLISHER', isPrimary: true }],
			details: {
				PUBLISHER: {
					specializations: ['NOPE'],
					offers: ['NOPE'],
					needs: [],
					answers: { nope: ['X'] }
				}
			}
		};
		const sections = recapSections(onboardingSteps(state(['PUBLISHER'])), input);
		const publisher = sections.find((s) => s.id === 'metier:PUBLISHER')!;
		expect(publisher.soon).toBe(true);
		expect(publisher.lines.every((l) => l.values.length === 0)).toBe(true);
		expect(publisher.lines.map((l) => l.label)).toEqual([
			'Spécialités',
			'Je propose',
			'Je recherche'
		]);
	});
});
