/**
 * Champs propres à chaque métier (ONB-04 à 11, D59) : le gabarit commun.
 * Module pur, partagé par le serveur et le navigateur.
 *
 * Un métier se décrit par des **données** (`src/lib/actors/catalog/`) :
 * ses offres, ses besoins et ses champs. Un champ est un choix unique ou
 * multiple parmi des codes ; il peut être requis, et ne s'afficher que si une
 * spécialité, une offre ou un besoin est coché (« si A&R », « si
 * programmation »). Les réponses vont dans `person_track_attributes` : seules
 * les réponses données sont stockées, une absence vaut « inconnu ».
 *
 * Pas de texte libre ni de fiche d'événement ici : ce qui décrit une date,
 * un brief ou une organisation appartient à l'annonce ou à l'organisation,
 * vérifiée à part. Un métier « bientôt » (D15) n'impose aucun champ.
 */
import { TRACKS, type TrackKindValue } from './tracks';
import { TRACK_CATALOGS } from './catalog';

import type { TrackField, FieldCondition } from './catalog/types';

export type { FieldCondition, FieldOption, TrackCatalog, TrackField } from './catalog/types';
export { territoryField } from './catalog/types';

/** Ce que la personne a coché pour ce métier. */
export type TrackChoices = {
	specializations: readonly string[];
	offers: readonly string[];
	needs: readonly string[];
};

export type FieldAnswers = Record<string, string[]>;

export function trackFields(track: TrackKindValue): readonly TrackField[] {
	return TRACK_CATALOGS[track].fields;
}

function matches(when: FieldCondition | undefined, choices: TrackChoices): boolean {
	if (!when) return true;
	const any = (codes: readonly string[] | undefined, chosen: readonly string[]) =>
		(codes ?? []).some((c) => chosen.includes(c));
	return (
		any(when.specializations, choices.specializations) ||
		any(when.offers, choices.offers) ||
		any(when.needs, choices.needs)
	);
}

/** Champs à montrer pour ces choix, dans l'ordre du catalogue. */
export function visibleFields(track: TrackKindValue, choices: TrackChoices): TrackField[] {
	return trackFields(track).filter((f) => matches(f.when, choices));
}

/** Un champ est-il exigé ? Seulement s'il s'affiche, pour un métier ouvert. */
export function isRequired(track: TrackKindValue, field: TrackField): boolean {
	return field.required === true && TRACKS[track].available;
}

export const FIELD_MESSAGES = {
	required: 'Ce champ est requis.',
	unknownField: 'Précision inconnue.',
	unknownCode: 'Ce choix n’existe pas.',
	single: 'Un seul choix possible.'
} as const;

export type FieldsCheck =
	{ ok: true; answers: FieldAnswers } | { ok: false; field: string; message: string };

/**
 * Vérifie et normalise les réponses : champs et codes du métier, une valeur
 * pour un choix unique, champs requis remplis, ordre du catalogue. Les
 * réponses d'un champ masqué (sa condition n'est plus cochée) sont retirées.
 */
export function checkFields(
	track: TrackKindValue,
	choices: TrackChoices,
	input: FieldAnswers
): FieldsCheck {
	const all = trackFields(track);
	for (const id of Object.keys(input))
		if (!all.some((f) => f.id === id))
			return { ok: false, field: id, message: FIELD_MESSAGES.unknownField };

	const answers: FieldAnswers = {};
	for (const field of visibleFields(track, choices)) {
		const codes = input[field.id] ?? [];
		const known = field.options.map((o) => o.code);
		if (codes.some((c) => !known.includes(c)))
			return { ok: false, field: field.id, message: FIELD_MESSAGES.unknownCode };
		const kept = known.filter((c) => codes.includes(c));
		if (field.kind === 'single' && kept.length > 1)
			return { ok: false, field: field.id, message: FIELD_MESSAGES.single };
		if (kept.length === 0 && isRequired(track, field))
			return { ok: false, field: field.id, message: FIELD_MESSAGES.required };
		if (kept.length > 0) answers[field.id] = kept;
	}
	return { ok: true, answers };
}
