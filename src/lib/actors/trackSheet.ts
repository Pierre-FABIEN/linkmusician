/**
 * Fiche publique d'un métier et visibilité par bloc (ONB-12b, D61). Module pur.
 *
 * Trois blocs par métier, chacun public, réservé aux membres ou privé :
 * - `offers` : spécialités, « Je propose », « Je recherche » (et, pour le
 *   métier musicien·ne, l'expérience et l'engagement) ;
 * - `details` : champs propres du catalogue (précisions) ;
 * - `conditions` : champs marqués `block: 'conditions'` (Q65).
 *
 * Seuls les blocs que le lecteur peut voir sont mis en forme : un bloc
 * masqué n'apparaît pas, même vide, dans ce qui part vers le navigateur.
 */
import { TRACKS, type TrackKindValue } from './tracks';
import { INTENTS, SPECIALIZATIONS } from './specializations';
import { trackFields, type FieldAnswers } from './trackFields';
import {
	COMMITMENT_INFO,
	DETAIL_FIELDS,
	PRACTICE_EXPERIENCE_INFO,
	type CommitmentValue,
	type PracticeExperienceValue
} from '#lib/musician/profile';

export const TRACK_VISIBILITIES = ['PUBLIC', 'MEMBERS', 'PRIVATE'] as const;
export type TrackVisibilityValue = (typeof TRACK_VISIBILITIES)[number];

export const TRACK_VISIBILITY_LABELS: Readonly<Record<TrackVisibilityValue, string>> = {
	PUBLIC: 'Tout le monde',
	MEMBERS: 'Les membres inscrits',
	PRIVATE: 'Moi seulement'
};

export const TRACK_BLOCKS = ['offers', 'details', 'conditions'] as const;
export type TrackBlock = (typeof TRACK_BLOCKS)[number];

export const TRACK_BLOCK_INFO: Readonly<Record<TrackBlock, { label: string; hint: string }>> = {
	offers: {
		label: 'Spécialités et intentions',
		hint: 'Tes spécialités, ce que tu proposes et ce que tu recherches.'
	},
	details: { label: 'Précisions', hint: 'Ta façon de travailler : formats, jauges, matériel…' },
	conditions: {
		label: 'Conditions',
		hint: 'Rémunération, capacité, accueil : privé par défaut.'
	}
};

/** Réglages d'un métier, tels qu'enregistrés sur `person_tracks`. */
export type TrackSettings = {
	offersVisibility: TrackVisibilityValue;
	detailsVisibility: TrackVisibilityValue;
	conditionsVisibility: TrackVisibilityValue;
	/** `null` : non précisé (Q66), jamais « non ». */
	openToRequests: boolean | null;
};

/** Qui regarde : un·e visiteur·se, un·e membre inscrit·e, la personne elle-même. */
export type Audience = 'public' | 'members' | 'owner';

export function canSee(visibility: TrackVisibilityValue, audience: Audience): boolean {
	if (audience === 'owner') return true;
	if (visibility === 'PUBLIC') return true;
	return visibility === 'MEMBERS' && audience === 'members';
}

export function blockVisibility(settings: TrackSettings, block: TrackBlock): TrackVisibilityValue {
	return settings[`${block}Visibility`];
}

/** Bloc d'un champ propre du catalogue. */
export function fieldBlock(field: { block?: 'conditions' }): 'details' | 'conditions' {
	return field.block === 'conditions' ? 'conditions' : 'details';
}

export type SheetLine = { label: string; values: string[] };

/** Ce qu'une personne a déclaré pour un métier. */
export type TrackSheetInput = {
	track: TrackKindValue;
	isPrimary: boolean;
	specializations: readonly string[];
	offers: readonly string[];
	needs: readonly string[];
	answers: FieldAnswers;
	settings: TrackSettings;
	/** Métier musicien·ne seulement. */
	musician?: {
		practiceExperience: PracticeExperienceValue | null;
		commitment: CommitmentValue | null;
	};
};

export type TrackSheet = {
	track: TrackKindValue;
	label: string;
	isPrimary: boolean;
	/** Le lecteur voit-il le bloc des intentions (et `lookingFor`, sa copie D58) ? */
	offersVisible: boolean;
	/** Absent si le lecteur ne voit pas le bloc des intentions. */
	openToRequests?: boolean | null;
	/** Lignes de chaque bloc visible et non vide. */
	blocks: { block: TrackBlock; label: string; lines: SheetLine[] }[];
};

type Options = readonly { code: string; label: string }[];

const labelsOf = (options: Options, codes: readonly string[]) =>
	options.filter((o) => codes.includes(o.code)).map((o) => o.label);

function offerLines(input: TrackSheetInput): SheetLine[] {
	const { track } = input;
	const m = input.musician;
	return [
		{ label: 'Spécialités', values: labelsOf(SPECIALIZATIONS[track], input.specializations) },
		...(m
			? [
					{
						label: 'Expérience',
						values: m.practiceExperience
							? [PRACTICE_EXPERIENCE_INFO[m.practiceExperience].label]
							: []
					},
					{ label: 'Engagement', values: m.commitment ? [COMMITMENT_INFO[m.commitment].label] : [] }
				]
			: []),
		{ label: 'Je propose', values: labelsOf(INTENTS[track].OFFER, input.offers) },
		{ label: 'Je recherche', values: labelsOf(INTENTS[track].NEED, input.needs) }
	];
}

function fieldLines(input: TrackSheetInput, block: 'details' | 'conditions'): SheetLine[] {
	const fields =
		input.track === 'MUSICIAN'
			? block === 'details'
				? DETAIL_FIELDS
				: []
			: trackFields(input.track).filter((f) => fieldBlock(f) === block);
	return fields.map((f) => ({
		label: f.label,
		values: labelsOf(f.options, input.answers[f.id] ?? [])
	}));
}

/** La fiche d'un métier telle que `audience` peut la voir. */
export function trackSheet(input: TrackSheetInput, audience: Audience): TrackSheet {
	const blocks: TrackSheet['blocks'] = [];
	for (const block of TRACK_BLOCKS) {
		if (!canSee(blockVisibility(input.settings, block), audience)) continue;
		const lines = (block === 'offers' ? offerLines(input) : fieldLines(input, block)).filter(
			(l) => l.values.length > 0
		);
		if (lines.length > 0) blocks.push({ block, label: TRACK_BLOCK_INFO[block].label, lines });
	}
	return {
		track: input.track,
		label: TRACKS[input.track].label,
		isPrimary: input.isPrimary,
		offersVisible: canSee(input.settings.offersVisibility, audience),
		...(canSee(input.settings.offersVisibility, audience)
			? { openToRequests: input.settings.openToRequests }
			: {}),
		blocks
	};
}
