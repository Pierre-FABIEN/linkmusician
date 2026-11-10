/**
 * Objectifs des métiers du son : ingé son (P4-02b, conception 08 §5) et
 * producteur·rice (P4-04, 08 §7). Les prochains
 * objectifs atteignables, calculés depuis l'état courant, comme ceux des
 * musicien·nes (`quests.ts`). Les prestations proposées suivent les
 * spécialités cochées : on ne propose pas un mastering à qui ne fait que de
 * la façade.
 */
import { BAREME } from './bareme';
import type { CraftFacts } from './craftSummary';
import type { Objective } from './quests';

/** Spécialités des profils (`#lib/crafts/*`), recopiées pour garder le noyau pur. */
export type SoundSpecialty = 'RECORDING' | 'MIXING' | 'MASTERING' | 'LIVE_FOH' | 'LIVE_MONITORS';
export type ProducerSpecialty = 'PRODUCTION' | 'ARRANGEMENT' | 'BEATMAKING';

type CraftQuestState<S extends string> = CraftFacts & {
	specialties: readonly S[];
	hasZone: boolean;
};
export type SoundQuestState = CraftQuestState<SoundSpecialty>;
export type ProducerQuestState = CraftQuestState<ProducerSpecialty>;

type Candidate<S extends string> = Objective & {
	done: (s: CraftQuestState<S>) => boolean;
	/** Proposé seulement si l'une de ces spécialités est cochée. */
	forSpecialties?: readonly S[];
};

const ARTISTS_TARGET = 3;

const SOUND: readonly Candidate<SoundSpecialty>[] = [
	{
		id: 'sound.specialty',
		label: 'Coche tes spécialités pour qu’on te trouve',
		href: '/profil/son',
		done: (s) => s.specialties.length > 0
	},
	{ id: 'sound.zone', label: 'Indique ta ville', href: '/profil/ville', done: (s) => s.hasZone },
	{
		id: 'sound.listening',
		label: 'Ajoute un travail en écoute (un avant / après)',
		href: '/profil/son',
		done: (s) => s.listeningWorks >= 1
	},
	{
		id: 'sound.recording.first',
		label: 'Fais une première session d’enregistrement',
		href: '/decouvrir',
		xp: BAREME.services.RECORDING,
		forSpecialties: ['RECORDING'],
		done: (s) => s.byService.RECORDING >= 1
	},
	{
		id: 'sound.mixing.first',
		label: 'Signe un premier mixage',
		href: '/decouvrir',
		xp: BAREME.services.MIXING,
		forSpecialties: ['MIXING'],
		done: (s) => s.byService.MIXING >= 1
	},
	{
		id: 'sound.mastering.first',
		label: 'Signe un premier mastering',
		href: '/decouvrir',
		xp: BAREME.services.MASTERING,
		forSpecialties: ['MASTERING'],
		done: (s) => s.byService.MASTERING >= 1
	},
	{
		id: 'sound.live.first',
		label: 'Sonorise une première date',
		href: '/jam',
		xp: BAREME.services.LIVE_SOUND,
		forSpecialties: ['LIVE_FOH', 'LIVE_MONITORS'],
		done: (s) => s.byService.LIVE_SOUND >= 1
	},
	{
		id: 'sound.artists',
		label: `Travaille avec ${ARTISTS_TARGET} artistes différent·es`,
		href: '/decouvrir',
		done: (s) => s.distinctArtists >= ARTISTS_TARGET
	}
];

const PRODUCER: readonly Candidate<ProducerSpecialty>[] = [
	{
		id: 'producer.specialty',
		label: 'Coche tes spécialités pour qu’on te trouve',
		href: '/profil/production',
		done: (s) => s.specialties.length > 0
	},
	{ id: 'producer.zone', label: 'Indique ta ville', href: '/profil/ville', done: (s) => s.hasZone },
	{
		id: 'producer.listening',
		label: 'Publie une production en écoute',
		href: '/profil/production',
		done: (s) => s.listeningWorks >= 1
	},
	{
		id: 'producer.production.first',
		label: 'Termine une première production avec un·e artiste',
		href: '/decouvrir',
		xp: BAREME.services.PRODUCTION,
		forSpecialties: ['PRODUCTION', 'BEATMAKING'],
		done: (s) => s.byService.PRODUCTION >= 1
	},
	{
		id: 'producer.arrangement.first',
		label: 'Signe un premier arrangement',
		href: '/decouvrir',
		xp: BAREME.services.ARRANGEMENT,
		forSpecialties: ['ARRANGEMENT'],
		done: (s) => s.byService.ARRANGEMENT >= 1
	},
	{
		id: 'producer.artists',
		label: `Produis ${ARTISTS_TARGET} artistes différent·es`,
		href: '/decouvrir',
		done: (s) => s.distinctArtists >= ARTISTS_TARGET
	},
	{
		id: 'producer.release',
		label: 'Une production sortie et vérifiée',
		href: '/decouvrir',
		xp: BAREME.releaseCreditVerified,
		done: (s) => s.verifiedReleaseCredits >= 1
	}
];

/** Objectifs à trois artistes : avancement affiché. */
const ARTISTS_IDS = ['sound.artists', 'producer.artists'];

function offered<S extends string>(c: Candidate<S>, s: CraftQuestState<S>) {
	return !c.forSpecialties || c.forSpecialties.some((sp) => s.specialties.includes(sp));
}

function next<S extends string>(
	list: readonly Candidate<S>[],
	state: CraftQuestState<S>,
	limit: number
): Objective[] {
	return list
		.filter((c) => offered(c, state) && !c.done(state))
		.slice(0, limit)
		.map(({ done: _done, forSpecialties: _for, ...objective }) =>
			ARTISTS_IDS.includes(objective.id)
				? {
						...objective,
						progress: {
							current: Math.min(state.distinctArtists, ARTISTS_TARGET),
							target: ARTISTS_TARGET
						}
					}
				: objective
		);
}

function progress<S extends string>(list: readonly Candidate<S>[], state: CraftQuestState<S>) {
	const shown = list.filter((c) => offered(c, state));
	return { done: shown.filter((c) => c.done(state)).length, total: shown.length };
}

/** Les prochains objectifs de l'ingé son, dans l'ordre du parcours. */
export const nextSoundObjectives = (state: SoundQuestState, limit = 3) => next(SOUND, state, limit);

/** Avancement sur les objectifs proposés : « N atteints sur M ». */
export const soundQuestProgress = (state: SoundQuestState) => progress(SOUND, state);

/** Les prochains objectifs du producteur ou de la productrice. */
export const nextProducerObjectives = (state: ProducerQuestState, limit = 3) =>
	next(PRODUCER, state, limit);

export const producerQuestProgress = (state: ProducerQuestState) => progress(PRODUCER, state);
