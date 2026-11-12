import { describe, expect, it } from 'vitest';
import { craftSummary } from './craftSummary';
import {
	agentQuestProgress,
	nextAgentObjectives,
	nextProducerObjectives,
	nextPromoterObjectives,
	nextSoundObjectives,
	producerQuestProgress,
	promoterQuestProgress,
	soundQuestProgress,
	type SoundQuestState
} from './craftQuests';
import { musicianSummary } from './summary';
import { craftTier } from './tiers';
import type { DomainEvent } from './events';

let seq = 0;
const at = new Date('2026-11-01T10:00:00Z');
const session = (
	participantIds: string[],
	services: Record<string, 'RECORDING' | 'MIXING' | 'MASTERING' | 'LIVE_SOUND' | 'PRODUCTION'>,
	collaborationId = `c${++seq}`
): DomainEvent => ({
	id: `e${++seq}`,
	occurredAt: at,
	type: 'collaboration.completed',
	collaborationId,
	participantIds,
	services
});

describe('craftSummary (P4-02b)', () => {
	const events: DomainEvent[] = [
		session(['sam', 'lea', 'malik'], { sam: 'RECORDING' }, 'c-rec'),
		session(['sam', 'noa'], { sam: 'MIXING' }),
		// Une productrice sur la même session n'est pas une artiste.
		session(['sam', 'zoe', 'nora'], { sam: 'MASTERING', nora: 'PRODUCTION' }),
		// Sam y joue : ce n'est pas une prestation d'ingé son.
		session(['sam', 'lea'], {}),
		{
			id: 'r1',
			occurredAt: at,
			type: 'release.credit_verified',
			actorId: 'sam',
			releaseId: 'ep',
			track: 'SOUND_ENGINEER'
		},
		{
			id: 'r2',
			occurredAt: at,
			type: 'release.credit_verified',
			actorId: 'sam',
			releaseId: 'ep-prod',
			track: 'PRODUCER'
		}
	];

	it('compte les prestations de la piste, les artistes distincts et les sorties', () => {
		const facts = craftSummary('sam', 'SOUND_ENGINEER', events, 2);
		expect(facts).toMatchObject({
			listeningWorks: 2,
			projects: 3,
			distinctArtists: 4,
			verifiedReleaseCredits: 1
		});
		expect(facts.byService).toMatchObject({ RECORDING: 1, MIXING: 1, MASTERING: 1, LIVE_SOUND: 0 });
		expect(craftTier(facts).tier?.id).toBe('FIRST_PROJECTS');
	});

	it('une même collaboration ne compte qu’une fois', () => {
		const replay = session(['sam', 'lea', 'malik'], { sam: 'RECORDING' }, 'c-rec');
		expect(craftSummary('sam', 'SOUND_ENGINEER', [...events, replay], 0).projects).toBe(3);
	});

	it('la piste producteur·rice ne compte que ses propres prestations', () => {
		expect(craftSummary('nora', 'PRODUCER', events, 0)).toMatchObject({
			projects: 1,
			distinctArtists: 1
		});
	});

	it('une prestation ne compte pas comme collaboration de musicien·ne', () => {
		expect(musicianSummary('sam', events)).toMatchObject({
			collaborations: 1,
			distinctCollaborators: 1
		});
		// Pour Léa, qui jouait, la session compte.
		expect(musicianSummary('lea', events).collaborations).toBe(2);
	});
});

describe('objectifs de l’ingé son (P4-02b)', () => {
	const empty = craftSummary('sam', 'SOUND_ENGINEER', [], 0);
	const state = (o: Partial<SoundQuestState> = {}): SoundQuestState => ({
		...empty,
		specialties: [],
		hasZone: false,
		...o
	});

	it('commence par les spécialités, la ville, puis un travail en écoute', () => {
		expect(nextSoundObjectives(state()).map((o) => o.id)).toEqual([
			'sound.specialty',
			'sound.zone',
			'sound.listening'
		]);
	});

	it('propose seulement les prestations des spécialités cochées', () => {
		const ids = (s: SoundQuestState) => nextSoundObjectives(s, 10).map((o) => o.id);
		const live = state({ specialties: ['LIVE_FOH'], hasZone: true, listeningWorks: 1 });
		expect(ids(live)).toEqual(['sound.live.first', 'sound.artists']);
		const studio = state({ specialties: ['RECORDING', 'MIXING'], hasZone: true });
		expect(ids(studio)).toEqual([
			'sound.listening',
			'sound.recording.first',
			'sound.mixing.first',
			'sound.artists'
		]);
		expect(soundQuestProgress(studio)).toEqual({ done: 2, total: 6 });
	});

	it('montre l’avancement vers trois artistes, et l’XP indicative', () => {
		const s = state({
			specialties: ['MIXING'],
			hasZone: true,
			listeningWorks: 1,
			distinctArtists: 2,
			byService: { ...empty.byService, MIXING: 1 }
		});
		expect(nextSoundObjectives(s)).toEqual([
			expect.objectContaining({ id: 'sound.artists', progress: { current: 2, target: 3 } })
		]);
		expect(nextSoundObjectives(state({ specialties: ['MIXING'], hasZone: true }))[1]).toMatchObject(
			{
				id: 'sound.mixing.first',
				xp: 300
			}
		);
	});
});

describe('objectifs du producteur ou de la productrice (P4-04)', () => {
	const empty = craftSummary('nora', 'PRODUCER', [], 0);
	const ids = (s: Parameters<typeof nextProducerObjectives>[0]) =>
		nextProducerObjectives(s, 10).map((o) => o.id);

	it('beatmaking : la première production, pas l’arrangement', () => {
		const state = {
			...empty,
			specialties: ['BEATMAKING'] as const,
			hasZone: true,
			listeningWorks: 1
		};
		expect(ids({ ...state, specialties: [...state.specialties] })).toEqual([
			'producer.production.first',
			'producer.artists',
			'producer.release'
		]);
	});

	it('une sortie vérifiée créditée clôt le parcours', () => {
		const facts = craftSummary(
			'nora',
			'PRODUCER',
			[
				session(['nora', 'a'], { nora: 'PRODUCTION' }),
				session(['nora', 'b'], { nora: 'PRODUCTION' }),
				session(['nora', 'c'], { nora: 'PRODUCTION' }),
				{
					id: 'rel',
					occurredAt: at,
					type: 'release.credit_verified',
					actorId: 'nora',
					releaseId: 'single',
					track: 'PRODUCER'
				}
			],
			1
		);
		const state = { ...facts, specialties: ['PRODUCTION' as const], hasZone: true };
		expect(nextProducerObjectives(state)).toEqual([]);
		expect(producerQuestProgress(state)).toEqual({ done: 6, total: 6 });
	});
});

describe('objectifs de l’organisateur·rice (P5-05a)', () => {
	const empty = {
		eventKinds: 0,
		genres: 0,
		hasZone: false,
		gigSlots: 0,
		bandsProgrammed: 0,
		publicJams: 0,
		events: 0,
		firstDates: 0
	};

	it('commence par la fiche, la ville et un premier plateau', () => {
		expect(nextPromoterObjectives(empty).map((o) => o.id)).toEqual([
			'promoter.profile',
			'promoter.zone',
			'promoter.gigslot'
		]);
		expect(promoterQuestProgress(empty)).toEqual({ done: 0, total: 7 });
	});

	it('après un premier groupe programmé : l’événement tenu, puis les premières dates', () => {
		const state = {
			...empty,
			eventKinds: 2,
			genres: 1,
			hasZone: true,
			gigSlots: 1,
			bandsProgrammed: 1,
			firstDates: 1
		};
		const next = nextPromoterObjectives(state);
		expect(next.map((o) => o.id)).toEqual([
			'promoter.event.first',
			'promoter.newcomers',
			'promoter.jam'
		]);
		expect(next[1].progress).toEqual({ current: 1, target: 3 });
	});
});

describe('objectifs du manager et du booker (P5-07)', () => {
	const base = {
		genres: 0,
		hasZone: false,
		proposals: 0,
		artists: 0,
		developedArtists: 0,
		bookedDates: 0,
		bookedTours: 0
	};

	it('une proposition sans confirmation ne valide pas « premier accompagnement »', () => {
		const state = { ...base, kind: 'MANAGER' as const, genres: 2, hasZone: true, proposals: 1 };
		expect(nextAgentObjectives(state).map((o) => o.id)).toEqual(['agent.first', 'agent.developed']);
		expect(agentQuestProgress(state)).toEqual({ done: 3, total: 5 });
	});

	it('le booker vise la date bookée puis la tournée', () => {
		const state = {
			...base,
			kind: 'BOOKER' as const,
			genres: 1,
			hasZone: true,
			proposals: 1,
			artists: 1
		};
		const next = nextAgentObjectives(state);
		expect(next.map((o) => o.id)).toEqual(['agent.date', 'agent.tour']);
		expect(next[1].xp).toBe(400);
	});
});
