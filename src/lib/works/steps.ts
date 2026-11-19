/**
 * Étapes de production prises en charge (DASH-06a, #51, D68) : règles pures,
 * partagées par le serveur et le navigateur.
 *
 * Une personne qui gère un morceau peut prendre elle-même l'enregistrement
 * (mode « moi-même », lieu « mon home studio », sans adresse ni fiche studio).
 * **Seule la personne responsable** fait avancer le statut ; le reste de la
 * gestion peut seulement libérer une étape non terminée. Une étape déclarée
 * n'est jamais une preuve ni une source d'XP ; terminée, elle compte comme
 * réalisation déclarée (`#lib/works/production`, DASH-06c).
 */
import { z } from 'zod';

export const WORK_STEP_KINDS = ['RECORDING', 'MIXING', 'MASTERING', 'PRODUCTION'] as const;
export type WorkStepKindValue = (typeof WORK_STEP_KINDS)[number];
/** Étapes ouvertes dans ce lot ; les autres restent « bientôt ». */
export const OPEN_WORK_STEP_KINDS: readonly WorkStepKindValue[] = ['RECORDING'];

export const WORK_STEP_KIND_LABELS: Readonly<Record<WorkStepKindValue, string>> = {
	RECORDING: 'Enregistrement',
	MIXING: 'Mixage',
	MASTERING: 'Mastering',
	PRODUCTION: 'Production'
};

export const WORK_STEP_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export type WorkStepStatusValue = (typeof WORK_STEP_STATUSES)[number];
export const WORK_STEP_STATUS_LABELS: Readonly<Record<WorkStepStatusValue, string>> = {
	TODO: 'À faire',
	IN_PROGRESS: 'En cours',
	DONE: 'Terminé'
};

export const WORK_STEP_PLACE_LABELS = { HOME: 'Mon home studio' } as const;

export const WORK_STEP_ACTIONS = [
	'claim',
	'start',
	'finish',
	'reset',
	'reopen',
	'release'
] as const;
export type WorkStepAction = (typeof WORK_STEP_ACTIONS)[number];

export type WorkStepAct = WorkStepActKindValue;
export type WorkStepActKindValue =
	'CLAIMED' | 'STARTED' | 'FINISHED' | 'RESET' | 'REOPENED' | 'RELEASED' | 'AUTO_RELEASED';

export const WORK_STEP_ACT_LABELS: Readonly<Record<WorkStepActKindValue, string>> = {
	CLAIMED: 'Prise en charge',
	STARTED: 'Commencée',
	FINISHED: 'Déclarée terminée',
	RESET: 'Remise à faire',
	REOPENED: 'Rouverte',
	RELEASED: 'Libérée',
	AUTO_RELEASED: 'Libérée automatiquement'
};

/** Formulaire : l'intention seulement ; statut et dates sont calculés côté serveur. */
export const workStepFormSchema = z.object({
	kind: z.enum(WORK_STEP_KINDS),
	action: z.enum(WORK_STEP_ACTIONS),
	/** Révision vue par la personne : un changement périmé est refusé. */
	revision: z.coerce.number().int().min(0).default(0),
	/** « Terminer » exige une confirmation explicite. */
	confirm: z
		.union([z.literal('1'), z.literal('on'), z.literal('')])
		.optional()
		.transform((v) => v === '1' || v === 'on')
});
export type WorkStepForm = z.infer<typeof workStepFormSchema>;

export type WorkStepState = {
	status: WorkStepStatusValue;
	assigneeId: string | null;
	startedAt: Date | null;
	doneAt: Date | null;
};

export type WorkStepPlan =
	| { kind: 'noop' }
	| { kind: 'error'; message: string; status: number }
	| {
			kind: 'apply';
			act: WorkStepActKindValue;
			next: WorkStepState & { mode: 'SELF' | null; place: 'HOME' | null };
	  };

const err = (message: string, status = 400): WorkStepPlan => ({ kind: 'error', message, status });

/** Étape libérée : plus de responsable, elle repart de « À faire ». L'avancement
 * passé reste lisible dans l'historique (actes), jamais effacé. */
const RELEASED_STEP = {
	status: 'TODO',
	assigneeId: null,
	startedAt: null,
	doneAt: null,
	mode: null,
	place: null
} as const satisfies WorkStepState & { mode: null; place: null };

/**
 * Ce que produit une action sur une étape (pure). `current` est `null` si
 * l'étape n'existe pas encore. `actorId` gère le morceau (vérifié par
 * l'appelant sous verrou). Rejouer une action déjà appliquée par la même
 * personne ne change rien et n'ajoute aucun acte (`noop`).
 */
export function planWorkStep(
	current: WorkStepState | null,
	action: WorkStepAction,
	actorId: string,
	now: Date,
	confirm = false
): WorkStepPlan {
	const assignee = current?.assigneeId ?? null;
	const mine = assignee === actorId;
	const self = (s: Omit<WorkStepState, 'assigneeId'>) => ({
		...s,
		assigneeId: actorId,
		mode: 'SELF' as const,
		place: 'HOME' as const
	});

	if (action === 'claim') {
		if (mine) return { kind: 'noop' };
		if (assignee) return err('Une autre personne a déjà pris cette étape en charge.', 409);
		// P1 : terminée par un compte supprimé, elle reste terminée (réalisation déclarée).
		if (current?.status === 'DONE') return err('Cette étape est déjà terminée.', 409);
		// Une étape libérée repart de zéro : rien de l'ancienne prise en charge.
		return {
			kind: 'apply',
			act: 'CLAIMED',
			next: self({ status: 'TODO', startedAt: null, doneAt: null })
		};
	}
	if (action === 'release') {
		if (!current || !assignee) return { kind: 'noop' };
		if (current.status === 'DONE')
			return err('Rouvre d’abord l’étape : une étape terminée ne se libère pas.', 409);
		return {
			kind: 'apply',
			act: 'RELEASED',
			next: RELEASED_STEP
		};
	}
	// Les autres actions sont réservées à la personne responsable.
	if (!current || !assignee) return err('Prends d’abord l’étape en charge.', 409);
	if (!mine) return err('Seule la personne responsable fait avancer cette étape.', 403);
	const s = current.status;
	switch (action) {
		case 'start':
			if (s === 'IN_PROGRESS') return { kind: 'noop' };
			if (s !== 'TODO') return err('Cette étape est déjà terminée : rouvre-la plutôt.', 409);
			return {
				kind: 'apply',
				act: 'STARTED',
				next: self({ status: 'IN_PROGRESS', startedAt: now, doneAt: null })
			};
		case 'finish':
			if (s === 'DONE') return { kind: 'noop' };
			if (!confirm) return err('Confirme que l’étape est terminée.');
			return {
				kind: 'apply',
				act: 'FINISHED',
				next: self({ status: 'DONE', startedAt: current.startedAt, doneAt: now })
			};
		case 'reset':
			if (s === 'TODO') return { kind: 'noop' };
			if (s !== 'IN_PROGRESS')
				return err('Une étape terminée se rouvre, elle ne se remet pas à faire.', 409);
			return {
				kind: 'apply',
				act: 'RESET',
				next: self({ status: 'TODO', startedAt: null, doneAt: null })
			};
		case 'reopen':
			if (s === 'IN_PROGRESS') return { kind: 'noop' };
			if (s !== 'DONE') return err('Seule une étape terminée se rouvre.', 409);
			return {
				kind: 'apply',
				act: 'REOPENED',
				next: self({ status: 'IN_PROGRESS', startedAt: current.startedAt ?? now, doneAt: null })
			};
	}
	return err('Action inconnue.');
}

/**
 * P1 (E10) : la personne responsable ne gère plus le morceau (départ, retrait,
 * rétrogradation, suppression de compte). Une étape non terminée est libérée,
 * avec un acte dédié ; une étape terminée reste à son nom, intacte. Rejouer
 * ne change rien (`noop`) : l'étape n'est plus à cette personne.
 */
export function planAccessLossRelease(
	current: WorkStepState | null,
	formerAssigneeId: string
): WorkStepPlan {
	if (!current || current.assigneeId !== formerAssigneeId || current.status === 'DONE')
		return { kind: 'noop' };
	return { kind: 'apply', act: 'AUTO_RELEASED', next: RELEASED_STEP };
}

/** Une transition calculée sur une révision dépassée est refusée, sans acte.
 * Un rejeu sans transition (`noop`) reste accepté : rien ne change. */
export function staleWorkStep(
	plan: WorkStepPlan,
	currentRevision: number,
	expectedRevision: number
): WorkStepPlan {
	if (plan.kind !== 'apply' || currentRevision === expectedRevision) return plan;
	return err('L’étape a changé entre-temps : recharge la page pour voir où elle en est.', 409);
}

/** Actions proposées à la personne qui regarde, dans l'ordre d'affichage. */
export function availableWorkStepActions(
	step: WorkStepState | null,
	viewerId: string,
	canManage: boolean
): WorkStepAction[] {
	if (!canManage) return [];
	// Terminée sans responsable (compte supprimé) : rien à reprendre.
	if (!step?.assigneeId) return step?.status === 'DONE' ? [] : ['claim'];
	const out: WorkStepAction[] = [];
	if (step.assigneeId === viewerId) {
		if (step.status === 'TODO') out.push('start', 'finish');
		if (step.status === 'IN_PROGRESS') out.push('finish', 'reset');
		if (step.status === 'DONE') out.push('reopen');
	}
	if (step.status !== 'DONE') out.push('release');
	return out;
}

export const WORK_STEP_ACTION_LABELS: Readonly<Record<WorkStepAction, string>> = {
	claim: 'Je m’en charge',
	start: 'Commencer',
	finish: 'Terminer',
	reset: 'Remettre à faire',
	reopen: 'Rouvrir',
	release: 'Libérer l’étape'
};
