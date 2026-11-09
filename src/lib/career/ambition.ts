/**
 * Ambition du mode carrière (P3-12, conception 07 §4.1) : règle pure,
 * partagée par le serveur et le navigateur.
 *
 * On choisit ce qu'on vise, comme les objectifs d'une saison. On en change
 * quand on veut, et il n'y a **jamais d'échec** : l'ambition ne fait que
 * mettre en avant certains objectifs et actes de la carte. Elle ne retire
 * rien, ne rapporte rien et n'entre dans aucun calcul.
 */

export const AMBITIONS = ['PLAY_BAND', 'STAGE', 'RECORD', 'PRO', 'SUPPORT'] as const;
export type AmbitionValue = (typeof AMBITIONS)[number];

export function isAmbition(value: unknown): value is AmbitionValue {
	return typeof value === 'string' && (AMBITIONS as readonly string[]).includes(value);
}

type AmbitionInfo = {
	label: string;
	/** Ce qu'elle met en avant, en une phrase. */
	pitch: string;
	/** Actes de la carte mis en avant (07 §2). */
	acts: readonly number[];
	/** Objectifs (quêtes système) mis en avant, dans l'ordre. */
	priorities: readonly string[];
};

export const AMBITION_INFO: Readonly<Record<AmbitionValue, AmbitionInfo>> = {
	PLAY_BAND: {
		label: 'Jouer en groupe pour le plaisir',
		pitch: 'Trouver ton groupe, répéter, composer ensemble.',
		acts: [1, 2],
		priorities: ['band.join', 'conversation.first', 'collaboration.first', 'work.first']
	},
	STAGE: {
		label: 'Monter sur scène',
		pitch: 'Un répertoire, des dates, puis une tournée.',
		acts: [2, 5],
		priorities: ['band.join', 'work.first', 'tier.stage']
	},
	RECORD: {
		label: 'Enregistrer et sortir ma musique',
		pitch: 'Le studio, la production, puis la sortie.',
		acts: [3, 4, 6],
		priorities: ['demo.first', 'work.first', 'collaboration.first']
	},
	PRO: {
		label: 'Devenir pro',
		pitch: 'Toute la carte, jusqu’à vivre de ta musique.',
		acts: [1, 2, 3, 4, 5, 6, 7, 8],
		priorities: ['demo.first', 'tier.collaborator', 'tier.stage']
	},
	SUPPORT: {
		label: 'Accompagner les autres',
		pitch: 'Ingé son, production, organisation : faire grandir les artistes.',
		acts: [3, 4, 5],
		priorities: ['collaboration.first', 'tier.collaborator', 'conversation.first']
	}
};

/** Objectifs mis en avant pour une ambition (aucun si elle n'est pas choisie). */
export function ambitionPriorities(ambition: AmbitionValue | null | undefined): readonly string[] {
	return ambition ? AMBITION_INFO[ambition].priorities : [];
}
