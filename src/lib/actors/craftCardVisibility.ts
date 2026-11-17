/**
 * Visibilité des fiches historiques d'un métier (ONB-12c2, D61, Q70). Module pur.
 *
 * Les cartes « Ingé son », « Producteur·rice » et « Organisateur·rice » de
 * `/@handle` viennent des pages `/profil/son`, `/profil/production` et
 * `/profil/organisateur`, antérieures aux blocs D61. Chaque champ déclaratif
 * suit désormais le bloc de son métier :
 * - spécialités, types d'événements : « spécialités et intentions » ;
 * - mobilité, matériel, logiciels, styles, jauge : « précisions » ;
 * - tarifs indicatifs : « conditions » (privé par défaut, Q65).
 *
 * Restent publics, comme avant : les références (portfolio déclaré, matrice
 * de la conception 06), les crédits confirmés, le rang, les plateaux ouverts
 * et les organisations gérées. Un champ masqué est vidé côté serveur : il ne
 * part jamais vers le navigateur.
 */
import { canSee, type Audience, type TrackBlock, type TrackVisibilityValue } from './trackSheet';

export type BlockSettings = {
	offersVisibility: TrackVisibilityValue;
	detailsVisibility: TrackVisibilityValue;
	conditionsVisibility: TrackVisibilityValue;
};

/** Bloc D61 de chaque champ déclaratif d'une carte historique. */
export const CRAFT_CARD_BLOCKS = {
	SOUND_ENGINEER: { specialties: 'offers', mobility: 'details', gear: 'details' },
	PRODUCER: {
		specialties: 'offers',
		mobility: 'details',
		software: 'details',
		genres: 'details',
		rate: 'conditions'
	},
	PROMOTER: { eventKinds: 'offers', genres: 'details', capacity: 'details' }
} as const satisfies Record<string, Record<string, TrackBlock>>;

export type CraftCardTrack = keyof typeof CRAFT_CARD_BLOCKS;

/** Un champ masqué vaut « rien de déclaré » : liste vide, texte vide ou `null`. */
function emptied(value: unknown): unknown {
	if (Array.isArray(value)) return [];
	if (typeof value === 'string') return '';
	return null;
}

/** La carte telle que ce lecteur peut la voir. Ne modifie pas `card`. */
export function gateCraftCard<T extends object>(
	track: CraftCardTrack,
	card: T,
	settings: BlockSettings,
	audience: Audience
): T {
	const out = { ...card } as Record<string, unknown>;
	for (const [field, block] of Object.entries(CRAFT_CARD_BLOCKS[track])) {
		if (field in out && !canSee(settings[`${block}Visibility`], audience)) {
			out[field] = emptied(out[field]);
		}
	}
	return out as T;
}

/** Libellés des champs, pour la note « Qui voit quoi » des pages historiques. */
export const CRAFT_FIELD_LABELS: Readonly<Record<string, string>> = {
	specialties: 'spécialités',
	eventKinds: 'ce que tu organises',
	mobility: 'où tu travailles',
	gear: 'matériel',
	software: 'logiciels',
	genres: 'styles',
	capacity: 'jauge',
	rate: 'tarifs indicatifs'
};

/** Champs d'une carte regroupés par bloc, dans l'ordre des blocs. */
export function craftFieldsByBlock(
	track: CraftCardTrack
): { block: TrackBlock; fields: string[] }[] {
	const order: TrackBlock[] = ['offers', 'details', 'conditions'];
	const entries = Object.entries(CRAFT_CARD_BLOCKS[track]) as [string, TrackBlock][];
	return order
		.map((block) => ({
			block,
			fields: entries.filter(([, b]) => b === block).map(([f]) => CRAFT_FIELD_LABELS[f] ?? f)
		}))
		.filter((g) => g.fields.length > 0);
}
