/**
 * Récapitulatif de l'onboarding (ONB-12a) : une section par étape remplie,
 * dans l'ordre du parcours, avec un lien pour y revenir. Les données sont
 * déjà enregistrées à chaque étape : revenir en arrière ne perd rien.
 *
 * Module pur : reçoit des codes et des noms, rend des libellés. Un code
 * inconnu du référentiel (retiré depuis) est ignoré, jamais affiché brut.
 */
import { TRACKS, type TrackKindValue } from '#lib/actors/tracks';
import { INTENTS, SPECIALIZATIONS, type IntentInfo } from '#lib/actors/specializations';
import { trackFields, type FieldAnswers } from '#lib/actors/trackFields';
import {
	COMMITMENT_INFO,
	DETAIL_FIELDS,
	PRACTICE_EXPERIENCE_INFO,
	type CommitmentValue,
	type PracticeExperienceValue
} from '#lib/musician/profile';
import { INSTRUMENT_LEVELS } from '#lib/skills/levels';
import type { OnboardingStep, OnboardingStepId } from './steps';

export type RecapLine = { label: string; values: string[] };

export type RecapSection = {
	id: OnboardingStepId;
	title: string;
	/** Étape à rouvrir pour corriger. */
	editPath: string;
	lines: RecapLine[];
	/** Métier « bientôt » (D15) : rien d'exigé. */
	soon?: boolean;
};

/** Ce qu'une personne a déclaré pour un métier. */
export type TrackRecapInput = {
	specializations: readonly string[];
	offers: readonly string[];
	needs: readonly string[];
	answers: FieldAnswers;
};

export type RecapInput = {
	tracks: readonly { track: TrackKindValue; isPrimary: boolean }[];
	instruments: readonly { name: string; level: number; isPrimary: boolean }[];
	genres: readonly string[];
	commune: string | null;
	radiusKm: number | null;
	musician: {
		practiceExperience: PracticeExperienceValue | null;
		commitment: CommitmentValue | null;
	} & TrackRecapInput;
	details: Partial<Record<TrackKindValue, TrackRecapInput>>;
};

type Options = readonly { code: string; label: string }[];

const labelsOf = (options: Options, codes: readonly string[]) =>
	options.filter((o) => codes.includes(o.code)).map((o) => o.label);

const intentLabels = (intents: readonly IntentInfo[], codes: readonly string[]) =>
	labelsOf(intents, codes);

/** Ordre du référentiel, retirées comprises (la personne les a déclarées). */
function specializationLabels(track: TrackKindValue, codes: readonly string[]): string[] {
	return labelsOf(SPECIALIZATIONS[track], codes);
}

/** Réponses aux champs propres, dans l'ordre du catalogue, seulement celles données. */
function answerLines(
	fields: readonly { id: string; label: string; options: Options }[],
	answers: FieldAnswers
): RecapLine[] {
	return fields
		.map((f) => ({ label: f.label, values: labelsOf(f.options, answers[f.id] ?? []) }))
		.filter((l) => l.values.length > 0);
}

function intentLines(track: TrackKindValue, input: TrackRecapInput): RecapLine[] {
	return [
		{ label: 'Je propose', values: intentLabels(INTENTS[track].OFFER, input.offers) },
		{ label: 'Je recherche', values: intentLabels(INTENTS[track].NEED, input.needs) }
	];
}

const EMPTY: TrackRecapInput = { specializations: [], offers: [], needs: [], answers: {} };

function levelLabel(level: number): string {
	return INSTRUMENT_LEVELS.find((l) => l.level === level)?.label ?? '';
}

function linesOf(step: OnboardingStep, input: RecapInput): RecapLine[] {
	if (step.track) {
		const details = input.details[step.track] ?? EMPTY;
		return [
			{ label: 'Spécialités', values: specializationLabels(step.track, details.specializations) },
			...intentLines(step.track, details),
			...answerLines(trackFields(step.track), details.answers)
		];
	}
	switch (step.id) {
		case 'metiers':
			return [
				{
					label: 'Métiers',
					values: input.tracks.map(
						(t) => TRACKS[t.track].label + (t.isPrimary ? ' (principal)' : '')
					)
				}
			];
		case 'instruments':
			return [
				{
					label: 'Instruments',
					values: input.instruments.map(
						(i) =>
							`${i.name}, ${levelLabel(i.level).toLowerCase()} (déclaré)` +
							(i.isPrimary ? ', principal' : '')
					)
				}
			];
		case 'genres':
			return [{ label: 'Genres', values: [...input.genres] }];
		case 'ville':
			return [
				{
					label: 'Ville',
					values: input.commune
						? [input.radiusKm ? `${input.commune}, jusqu’à ${input.radiusKm} km` : input.commune]
						: []
				}
			];
		case 'intention': {
			const m = input.musician;
			return [
				{
					label: 'Expérience',
					values: m.practiceExperience ? [PRACTICE_EXPERIENCE_INFO[m.practiceExperience].label] : []
				},
				{
					label: 'Engagement',
					values: m.commitment ? [COMMITMENT_INFO[m.commitment].label] : []
				},
				...intentLines('MUSICIAN', m),
				...(m.specializations.length > 0
					? [{ label: 'Écriture', values: specializationLabels('MUSICIAN', m.specializations) }]
					: []),
				...answerLines(DETAIL_FIELDS, m.answers)
			];
		}
		default:
			return [];
	}
}

/** Sections du récapitulatif : chaque étape à remplir, dans l'ordre du parcours. */
export function recapSections(steps: readonly OnboardingStep[], input: RecapInput): RecapSection[] {
	return steps
		.filter((s) => s.id !== 'recap' && s.id !== 'resultat')
		.map((s) => ({
			id: s.id,
			title: s.id === 'intention' ? TRACKS.MUSICIAN.label : s.label,
			editPath: s.path,
			lines: linesOf(s, input),
			...(s.track && !TRACKS[s.track].available ? { soon: true } : {})
		}));
}
