/**
 * Production d'un morceau (DASH-06c, #53, D70) : une seule lecture réunit les
 * **faits indépendants** (collaborations terminées, qui renseignent
 * `Work.recordedAt`…) et les **réalisations déclarées** (étape prise en
 * charge soi-même et terminée, DASH-06a). Module pur, partagé par le serveur
 * et le navigateur.
 *
 * - Un fait de collaboration prime toujours : il est daté et confirmé des
 *   deux côtés. Rouvrir ou libérer une étape déclarée ne l'efface jamais.
 * - Une étape terminée soi-même vaut `DECLARED` (« déclaré par Thomas »),
 *   jamais une preuve. Rien n'est écrit dans `Work` : la date déclarée est
 *   lue sur l'étape, si bien qu'une réouverture la retire aussitôt.
 * - Une étape prise en charge (même pas finie) n'est plus un besoin de
 *   recrutement ; on peut toujours chercher de l'aide volontairement.
 */
import type { WorkStepKindValue, WorkStepStatusValue } from './steps';

export type ProductionKind = WorkStepKindValue;

export const PRODUCTION_FIELDS = {
	RECORDING: 'recordedAt',
	MIXING: 'mixedAt',
	MASTERING: 'masteredAt',
	PRODUCTION: 'producedAt'
} as const satisfies Record<ProductionKind, string>;

export const PRODUCTION_KINDS = Object.keys(PRODUCTION_FIELDS) as ProductionKind[];

export type WorkDates = {
	recordedAt: Date | null;
	mixedAt: Date | null;
	masteredAt: Date | null;
	producedAt: Date | null;
};

export type StepFact = {
	kind: ProductionKind;
	status: WorkStepStatusValue;
	assigned: boolean;
	doneAt: Date | null;
	/** Nom affiché de la personne responsable (« Compte supprimé » le cas échéant). */
	assignee: string | null;
};

export type StageFact =
	| { source: 'COLLABORATION'; at: Date }
	| { source: 'DECLARED'; at: Date; declaredBy: string | null };

export type ProductionStages = Record<ProductionKind, StageFact | null>;

/** Où en est chaque étape : fait indépendant, sinon réalisation déclarée. */
export function productionStages(dates: WorkDates, steps: readonly StepFact[]): ProductionStages {
	const out = {} as ProductionStages;
	for (const kind of PRODUCTION_KINDS) {
		const fact = dates[PRODUCTION_FIELDS[kind]];
		const step = steps.find((s) => s.kind === kind);
		out[kind] = fact
			? { source: 'COLLABORATION', at: fact }
			: step?.status === 'DONE' && step.doneAt
				? { source: 'DECLARED', at: step.doneAt, declaredBy: step.assignee }
				: null;
	}
	return out;
}

/** Une étape franchie (fait indépendant ou déclaré) ou prise en charge. */
export function stageHandled(
	kind: ProductionKind,
	stages: ProductionStages,
	steps: readonly StepFact[]
): boolean {
	return stages[kind] !== null || steps.some((s) => s.kind === kind && s.assigned);
}

/**
 * Le besoin réellement ouvert d'un morceau composé, pour les suggestions :
 * l'enregistrement s'il n'est ni fait ni pris en charge ; une fois enregistré
 * (même déclaré), le mixage s'il n'est ni fait ni pris en charge. `null` :
 * rien à suggérer à ce stade.
 */
export function nextProductionNeed(
	stages: ProductionStages,
	steps: readonly StepFact[]
): 'RECORDING' | 'MIXING' | null {
	if (!stageHandled('RECORDING', stages, steps)) return 'RECORDING';
	if (stages.RECORDING && !stageHandled('MIXING', stages, steps)) return 'MIXING';
	return null;
}

export type RecordingSummary = 'RECORDED' | 'DECLARED' | 'IN_PROGRESS' | 'CLAIMED' | null;

/** DASH-06d : où en est l'enregistrement, pour les listes (Carrière, morceaux). */
export function recordingSummary(
	stages: ProductionStages,
	steps: readonly StepFact[]
): RecordingSummary {
	const fact = stages.RECORDING;
	if (fact) return fact.source === 'COLLABORATION' ? 'RECORDED' : 'DECLARED';
	const step = steps.find((s) => s.kind === 'RECORDING' && s.assigned);
	if (!step) return null;
	return step.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'CLAIMED';
}

export const RECORDING_SUMMARY_LABELS: Readonly<Record<Exclude<RecordingSummary, null>, string>> = {
	RECORDED: 'Enregistré',
	DECLARED: 'Enregistré · déclaré',
	IN_PROGRESS: 'Enregistrement en cours',
	CLAIMED: 'Enregistrement pris en charge'
};
