/**
 * Métiers (pistes) d'une personne : référentiel et règles de sélection.
 *
 * Module pur, partagé par le serveur et le navigateur. Les libellés vivent
 * ici, jamais en dur dans les composants. Décision D15 : tous les métiers
 * sont proposés dès l'inscription, mais seul « musicien » a un parcours
 * complet. Les autres créent un profil de base et sont marqués « bientôt »,
 * ce qui permet de mesurer la demande réelle.
 *
 * L'ordre de `TRACK_KINDS` est celui de l'affichage. Il doit rester aligné sur
 * l'enum Prisma `TrackKind` (vérifié à la compilation dans
 * `src/lib/prisma/actors/tracks.ts`).
 */

export const TRACK_KINDS = [
	'MUSICIAN',
	'PRODUCER',
	'SOUND_ENGINEER',
	'MANAGER',
	'BOOKER',
	'PROMOTER',
	'LABEL_PRO',
	'PUBLISHER',
	'MUSIC_COMMS'
] as const;

export type TrackKindValue = (typeof TRACK_KINDS)[number];

export type TrackInfo = {
	kind: TrackKindValue;
	/** Libellé inclusif, affiché tel quel. */
	label: string;
	/** Une ligne pour aider à choisir. */
	description: string;
	/** `false` : profil de base seulement, affiché « bientôt » (D15). */
	available: boolean;
};

export const TRACKS: Readonly<Record<TrackKindValue, TrackInfo>> = {
	MUSICIAN: {
		kind: 'MUSICIAN',
		label: 'Musicien·ne',
		description: 'Tu joues, tu chantes, tu composes, seul·e ou en groupe.',
		available: true
	},
	PRODUCER: {
		kind: 'PRODUCER',
		label: 'Producteur·rice',
		description: 'Tu produis des morceaux, des beats, des arrangements.',
		available: false
	},
	SOUND_ENGINEER: {
		kind: 'SOUND_ENGINEER',
		label: 'Ingé son',
		description: 'Tu enregistres, mixes, masterises ou sonorises des concerts.',
		available: false
	},
	MANAGER: {
		kind: 'MANAGER',
		label: 'Manager',
		description: "Tu accompagnes la carrière d'artistes.",
		available: false
	},
	BOOKER: {
		kind: 'BOOKER',
		label: 'Booker / programmateur·rice',
		description: 'Tu trouves des dates ou tu programmes une salle, un festival.',
		available: false
	},
	PROMOTER: {
		kind: 'PROMOTER',
		label: 'Organisateur·rice',
		description: 'Tu organises des concerts, des soirées, des tournées.',
		available: false
	},
	LABEL_PRO: {
		kind: 'LABEL_PRO',
		label: 'Professionnel·le de label',
		description: 'Tu travailles pour un label : A&R, production, distribution.',
		available: false
	},
	PUBLISHER: {
		kind: 'PUBLISHER',
		label: 'Éditeur·rice',
		description: 'Tu édites des œuvres musicales et gères leurs droits.',
		available: false
	},
	MUSIC_COMMS: {
		kind: 'MUSIC_COMMS',
		label: 'Communication musicale',
		description: 'Attaché·e de presse, community manager, journaliste musical·e.',
		available: false
	}
};

/** Référentiel dans l'ordre d'affichage. */
export const TRACK_LIST: readonly TrackInfo[] = TRACK_KINDS.map((kind) => TRACKS[kind]);

export function isTrackKind(value: unknown): value is TrackKindValue {
	return typeof value === 'string' && (TRACK_KINDS as readonly string[]).includes(value);
}

/** Sélection de métiers telle qu'enregistrée : au moins un, dont un principal. */
export type TrackSelection = {
	tracks: TrackKindValue[];
	primary: TrackKindValue;
};

export type TrackSelectionCheck =
	{ ok: true; selection: TrackSelection } | { ok: false; reason: 'empty' | 'primary' };

export const TRACK_MESSAGES: Record<Exclude<TrackSelectionCheck, { ok: true }>['reason'], string> =
	{
		empty: 'Choisis au moins un métier.',
		primary: 'Choisis ton métier principal parmi ceux que tu as cochés.'
	};

/**
 * Vérifie et normalise une sélection : doublons retirés, ordre du
 * référentiel, métier principal parmi les métiers choisis.
 *
 * Avec un seul métier coché, il devient principal d'office : la personne n'a
 * pas à le désigner une seconde fois.
 */
export function checkTrackSelection(
	tracks: readonly TrackKindValue[],
	primary: TrackKindValue | null | undefined
): TrackSelectionCheck {
	const chosen = TRACK_KINDS.filter((kind) => tracks.includes(kind));
	if (chosen.length === 0) return { ok: false, reason: 'empty' };
	if (chosen.length === 1) return { ok: true, selection: { tracks: chosen, primary: chosen[0] } };
	if (!primary || !chosen.includes(primary)) return { ok: false, reason: 'primary' };
	return { ok: true, selection: { tracks: chosen, primary } };
}

/**
 * Métier principal à proposer quand la sélection change dans le formulaire :
 * on garde le principal actuel s'il est encore coché, sinon le premier coché.
 */
export function suggestPrimary(
	tracks: readonly TrackKindValue[],
	current: TrackKindValue | null | undefined
): TrackKindValue | null {
	if (current && tracks.includes(current)) return current;
	return TRACK_KINDS.find((kind) => tracks.includes(kind)) ?? null;
}
