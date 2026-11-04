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

export function nextObjectives(state: QuestState, limit = 3): Objective[] {
	return CANDIDATES.filter((c) => !c.done(state))
		.slice(0, limit)
		.map(({ done: _done, ...objective }) => {
			const progress = progressOf(objective.id, state);
			return progress ? { ...objective, progress } : objective;
		});
}
