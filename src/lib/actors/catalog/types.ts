/**
 * Types du catalogue d'un métier (ONB-04 à 11, D59) : offres, besoins et
 * champs propres. Sans dépendance : les fichiers de catalogue l'importent,
 * `#lib/actors/trackFields` et `#lib/actors/specializations` les lisent.
 */
import type { IntentInfo } from '../specializations';

export type FieldOption = { code: string; label: string };

/** Le champ s'affiche si l'un de ces codes est coché (aucune condition : toujours). */
export type FieldCondition = {
	specializations?: readonly string[];
	offers?: readonly string[];
	needs?: readonly string[];
};

export type TrackField = {
	/** Identifiant stable, propre au métier, sans point (superforms y lit un chemin). */
	id: string;
	label: string;
	hint?: string;
	kind: 'single' | 'multi';
	options: readonly FieldOption[];
	/** Requis quand il s'affiche, pour un métier ouvert. */
	required?: boolean;
	when?: FieldCondition;
	/**
	 * Bloc de visibilité (D61) : `conditions` (privé par défaut, Q65) pour une
	 * condition de collaboration ; sinon le bloc « précisions ».
	 */
	block?: 'conditions';
};

/** Ce qu'un métier propose de déclarer, en plus de ses spécialités. */
export type TrackCatalog = {
	/** « Je propose » : prestations réellement offertes, indépendantes des spécialités. */
	offers: readonly IntentInfo[];
	/** « Je recherche » : codes distincts de ceux de l'offre. */
	needs: readonly IntentInfo[];
	fields: readonly TrackField[];
};

/** Territoire d'activité : un champ que la plupart des métiers demandent. */
export function territoryField(required = true): TrackField {
	return {
		id: 'territory',
		label: 'Où tu travailles',
		kind: 'multi',
		required,
		options: [
			{ code: 'LOCAL', label: 'Local' },
			{ code: 'REGIONAL', label: 'Régional' },
			{ code: 'NATIONAL', label: 'National' },
			{ code: 'INTERNATIONAL', label: 'International' }
		]
	};
}
