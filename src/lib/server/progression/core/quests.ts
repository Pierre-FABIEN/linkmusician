/**
 * Quêtes système (conception 02 §8) : les **trois prochains objectifs
 * atteignables**, calculés à partir de l'état courant. C'est le « prochain
 * objectif à débloquer » du tableau de bord.
 */
import { BAREME } from './bareme';
import type { MusicianSummary } from './tiers';

export type QuestState = MusicianSummary & {
	hasInstrument: boolean;
	hasGenre: boolean;
	hasZone: boolean;
	hasBio: boolean;
	demos: number;
	/** Morceaux composés où l'on est crédité·e et confirmé·e (P3-11). */
	works: number;
};

export type Objective = {
	id: string;
	label: string;
	/** Lien vers l'écran qui permet d'avancer. */
	href: string;
	/** XP indicative (jamais promise : multiplicateurs et plafonds s'appliquent). */
	xp?: number;
	progress?: { current: number; target: number };
};

type Candidate = Objective & { done: (s: QuestState) => boolean };

const CANDIDATES: readonly Candidate[] = [
	{
		id: 'profile.instrument',
		label: 'Ajoute ton premier instrument',
		href: '/profil/musical',
		done: (s) => s.hasInstrument
	},
	{
		id: 'profile.genre',
		label: 'Choisis tes genres',
		href: '/profil/musical',
		done: (s) => s.hasGenre
	},
	{ id: 'profile.zone', label: 'Indique ta ville', href: '/profil/ville', done: (s) => s.hasZone },
	{
		id: 'profile.bio',
		label: 'Écris ta présentation',
		href: '/profil',
		xp: BAREME.profileCompleted,
		done: (s) => s.hasBio
	},
	{
		id: 'demo.first',
		label: 'Publie ta première démo',
		href: '/profil/medias',
		xp: BAREME.firstDemo,
		done: (s) => s.demos >= 1
	},
	{
		id: 'conversation.first',
		label: 'Réponds à une annonce et échange avec quelqu’un',
		href: '/annonces',
		xp: BAREME.reciprocalConversation,
		done: (s) => s.reciprocalConversations >= 1
	},
	{
		id: 'band.join',
		label: 'Rejoins ou monte un groupe',
		href: '/groupes',
		xp: BAREME.membershipAccepted,
		done: (s) => s.bands >= 1
	},
	{
		id: 'collaboration.first',
		label: 'Termine une première collaboration',
		href: '/annonces',
		xp: BAREME.collaborationCompleted,
		done: (s) => s.collaborations >= 1
	},
	{
		id: 'work.first',
		label: 'Compose un premier morceau',
		href: '/morceaux',
		xp: BAREME.workComposed,
		done: (s) => s.works >= 1
	},
	{
		id: 'tier.collaborator',
		label: 'Collabore avec 2 personnes différentes (3 collaborations)',
		href: '/annonces',
		done: (s) => s.collaborations >= 3 && s.distinctCollaborators >= 2
	},
	{
		id: 'tier.stage',
		label: 'Joue 3 concerts corroborés',
		href: '/groupes',
		done: (s) => s.corroboratedGigs >= 3
	}
];

function progressOf(id: string, s: QuestState): Objective['progress'] {
	if (id === 'tier.collaborator') return { current: Math.min(s.collaborations, 3), target: 3 };
	if (id === 'tier.stage') return { current: Math.min(s.corroboratedGigs, 3), target: 3 };
	return undefined;
}

/** Les bases du profil passent toujours d'abord : sans elles, rien ne se joue. */
const BASICS = ['profile.instrument', 'profile.genre', 'profile.zone'];

/**
 * Les prochains objectifs atteignables. `priorities` (l'ambition, P3-12) met
 * certains objectifs en avant, juste après les bases du profil, sans en
 * retirer aucun : seul l'ordre change.
 */
export function nextObjectives(
	state: QuestState,
	limit = 3,
	priorities: readonly string[] = []
): Objective[] {
	const rank = (id: string) => {
		if (BASICS.includes(id)) return -1;
		const i = priorities.indexOf(id);
		return i === -1 ? priorities.length : i;
	};
	return CANDIDATES.map((c, order) => ({ c, order }))
		.filter(({ c }) => !c.done(state))
		.sort((a, b) => rank(a.c.id) - rank(b.c.id) || a.order - b.order)
		.slice(0, limit)
		.map(({ c: { done: _done, ...objective } }) => {
			const progress = progressOf(objective.id, state);
			return progress ? { ...objective, progress } : objective;
		});
}

/** Avancement sur l'ensemble des objectifs système : « Étape X sur N » (P2-12b). */
export function questProgress(state: QuestState): { done: number; total: number } {
	return {
		done: CANDIDATES.filter((c) => c.done(state)).length,
		total: CANDIDATES.length
	};
}
