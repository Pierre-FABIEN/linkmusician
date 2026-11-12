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
		href: '/messages',
		xp: BAREME.services.RECORDING,
		forSpecialties: ['RECORDING'],
		done: (s) => s.byService.RECORDING >= 1
	},
	{
		id: 'sound.mixing.first',
		label: 'Signe un premier mixage',
		href: '/messages',
		xp: BAREME.services.MIXING,
		forSpecialties: ['MIXING'],
		done: (s) => s.byService.MIXING >= 1
	},
	{
		id: 'sound.mastering.first',
		label: 'Signe un premier mastering',
		href: '/messages',
		xp: BAREME.services.MASTERING,
		forSpecialties: ['MASTERING'],
		done: (s) => s.byService.MASTERING >= 1
	},
	{
		id: 'sound.live.first',
		label: 'Sonorise une première date',
		href: '/messages',
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
		href: '/messages',
		xp: BAREME.services.PRODUCTION,
		forSpecialties: ['PRODUCTION', 'BEATMAKING'],
		done: (s) => s.byService.PRODUCTION >= 1
	},
	{
		id: 'producer.arrangement.first',
		label: 'Signe un premier arrangement',
		href: '/messages',
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

/**
 * Objectifs de l'organisateur·rice (P5-05a, conception 08 §8) : la fiche,
 * un premier plateau, un premier groupe programmé, puis les événements tenus
 * (P5-06). Lus dans le profil, les annonces et les événements `gig.held` ;
 * jamais l'XP.
 */
export type PromoterQuestState = {
	/** Types d'événements cochés et genres programmés. */
	eventKinds: number;
	genres: number;
	hasZone: boolean;
	/** Plateaux publiés, candidatures de groupe acceptées, jams publiques publiées. */
	gigSlots: number;
	bandsProgrammed: number;
	publicJams: number;
	/** Événements tenus et confirmés, artistes à leur toute première date (P5-06). */
	events: number;
	firstDates: number;
};

type PromoterCandidate = Objective & { done: (s: PromoterQuestState) => boolean };

const NEWCOMERS_TARGET = 3;

const PROMOTER: readonly PromoterCandidate[] = [
	{
		id: 'promoter.profile',
		label: 'Remplis ta fiche : ce que tu organises, tes genres',
		href: '/profil/organisateur',
		done: (s) => s.eventKinds > 0 && s.genres > 0
	},
	{ id: 'promoter.zone', label: 'Indique ta ville', href: '/profil/ville', done: (s) => s.hasZone },
	{
		id: 'promoter.gigslot',
		label: 'Publie un premier plateau',
		href: '/plateaux/nouveau',
		done: (s) => s.gigSlots >= 1
	},
	{
		id: 'promoter.band.first',
		label: 'Programme un premier groupe (accepte sa candidature)',
		href: '/annonces',
		done: (s) => s.bandsProgrammed >= 1
	},
	{
		id: 'promoter.event.first',
		label: 'Tiens un premier événement, confirmé par un groupe',
		href: '/annonces',
		xp: BAREME.gigHeld,
		done: (s) => s.events >= 1
	},
	{
		id: 'promoter.newcomers',
		label: `Programme ${NEWCOMERS_TARGET} groupes pour leur toute première date`,
		href: '/annonces',
		xp: BAREME.gigFirstDate,
		done: (s) => s.firstDates >= NEWCOMERS_TARGET
	},
	{
		id: 'promoter.jam',
		label: 'Organise une jam publique',
		href: '/jams/nouvelle',
		done: (s) => s.publicJams >= 1
	}
];

/** Les prochains objectifs de l'organisateur·rice, dans l'ordre du parcours. */
export function nextPromoterObjectives(state: PromoterQuestState, limit = 3): Objective[] {
	return PROMOTER.filter((c) => !c.done(state))
		.slice(0, limit)
		.map(({ done: _done, ...objective }) =>
			objective.id === 'promoter.newcomers'
				? {
						...objective,
						progress: {
							current: Math.min(state.firstDates, NEWCOMERS_TARGET),
							target: NEWCOMERS_TARGET
						}
					}
				: objective
		);
}

export const promoterQuestProgress = (state: PromoterQuestState) => ({
	done: PROMOTER.filter((c) => c.done(state)).length,
	total: PROMOTER.length
});

/**
 * Objectifs du manager et du booker (P5-07, conception 08 §9 et §10) : la
 * fiche, une première proposition, un premier accompagnement **confirmé**,
 * puis, pour le booker, une date bookée et jouée et une tournée ; pour le
 * manager, un artiste qui franchit deux rangs. Lus dans le profil, les
 * accompagnements et les événements ; jamais l'XP.
 */
export type AgentQuestState = {
	kind: 'MANAGER' | 'BOOKER';
	genres: number;
	hasZone: boolean;
	/** Propositions envoyées, quelle que soit la réponse. */
	proposals: number;
	/** Artistes dont l'accompagnement est confirmé, et développés. */
	artists: number;
	developedArtists: number;
	/** Dates bookées et jouées, tournées bookées (booker). */
	bookedDates: number;
	bookedTours: number;
};

type AgentCandidate = Objective & {
	done: (s: AgentQuestState) => boolean;
	only?: AgentQuestState['kind'];
};

const AGENT: readonly AgentCandidate[] = [
	{
		id: 'agent.profile',
		label: 'Remplis ta fiche : les genres que tu suis',
		href: '/profil/accompagnement',
		done: (s) => s.genres > 0
	},
	{ id: 'agent.zone', label: 'Indique ta ville', href: '/profil/ville', done: (s) => s.hasZone },
	{
		id: 'agent.proposal',
		label: 'Propose d’accompagner un artiste avec qui tu travailles',
		href: '/accompagnement',
		done: (s) => s.proposals >= 1
	},
	{
		id: 'agent.first',
		label: 'Premier accompagnement confirmé par l’artiste',
		href: '/accompagnement',
		xp: BAREME.managementConfirmed,
		only: 'MANAGER',
		done: (s) => s.artists >= 1
	},
	{
		id: 'agent.first',
		label: 'Premier accompagnement confirmé par l’artiste',
		href: '/accompagnement',
		only: 'BOOKER',
		done: (s) => s.artists >= 1
	},
	{
		id: 'agent.date',
		label: 'Une première date bookée et jouée, confirmée par le groupe',
		href: '/accompagnement',
		xp: BAREME.gigBooked,
		only: 'BOOKER',
		done: (s) => s.bookedDates >= 1
	},
	{
		id: 'agent.tour',
		label: 'Booke une tournée : 3 dates dans 3 villes en 30 jours',
		href: '/accompagnement',
		xp: BAREME.tourBooked,
		only: 'BOOKER',
		done: (s) => s.bookedTours >= 1
	},
	{
		id: 'agent.developed',
		label: 'Aide un groupe accompagné à franchir deux rangs',
		href: '/accompagnement',
		only: 'MANAGER',
		done: (s) => s.developedArtists >= 1
	}
];

const agentCandidates = (kind: AgentQuestState['kind']) =>
	AGENT.filter((c) => !c.only || c.only === kind);

/** Les prochains objectifs du manager ou du booker, dans l'ordre du parcours. */
export function nextAgentObjectives(state: AgentQuestState, limit = 3): Objective[] {
	return agentCandidates(state.kind)
		.filter((c) => !c.done(state))
		.slice(0, limit)
		.map(({ done: _done, only: _only, ...objective }) => objective);
}

export const agentQuestProgress = (state: AgentQuestState) => {
	const list = agentCandidates(state.kind);
	return { done: list.filter((c) => c.done(state)).length, total: list.length };
};
