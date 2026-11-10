/**
 * Objectifs de l'ingé son (P4-02b, conception 08 §5) : les prochains
 * objectifs atteignables, calculés depuis l'état courant, comme ceux des
 * musicien·nes (`quests.ts`). Les prestations proposées suivent les
 * spécialités cochées : on ne propose pas un mastering à qui ne fait que de
 * la façade.
 */
import { BAREME } from './bareme';
import type { CraftFacts } from './craftSummary';
import type { Objective } from './quests';

/** Spécialités du profil (`#lib/crafts/sound`), recopiées pour garder le noyau pur. */
export type SoundSpecialty = 'RECORDING' | 'MIXING' | 'MASTERING' | 'LIVE_FOH' | 'LIVE_MONITORS';

export type SoundQuestState = CraftFacts & {
	specialties: readonly SoundSpecialty[];
	hasZone: boolean;
};

type Candidate = Objective & {
	done: (s: SoundQuestState) => boolean;
	/** Proposé seulement si l'une de ces spécialités est cochée. */
	forSpecialties?: readonly SoundSpecialty[];
};

const ARTISTS_TARGET = 3;

const CANDIDATES: readonly Candidate[] = [
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

const offered = (c: Candidate, s: SoundQuestState) =>
	!c.forSpecialties || c.forSpecialties.some((sp) => s.specialties.includes(sp));

function progressOf(id: string, s: SoundQuestState): Objective['progress'] {
	if (id === 'sound.artists')
		return { current: Math.min(s.distinctArtists, ARTISTS_TARGET), target: ARTISTS_TARGET };
	return undefined;
}

/** Les prochains objectifs de l'ingé son, dans l'ordre du parcours. */
export function nextSoundObjectives(state: SoundQuestState, limit = 3): Objective[] {
	return CANDIDATES.filter((c) => offered(c, state) && !c.done(state))
		.slice(0, limit)
		.map(({ done: _done, forSpecialties: _for, ...objective }) => {
			const progress = progressOf(objective.id, state);
			return progress ? { ...objective, progress } : objective;
		});
}

/** Avancement sur les objectifs proposés : « N atteints sur M ». */
export function soundQuestProgress(state: SoundQuestState): { done: number; total: number } {
	const list = CANDIDATES.filter((c) => offered(c, state));
	return { done: list.filter((c) => c.done(state)).length, total: list.length };
}
