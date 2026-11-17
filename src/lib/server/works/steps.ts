/**
 * Étapes de production prises en charge (DASH-06a, #51, D68). Seul point
 * d'écriture de `work_steps` et `work_step_acts` (hors anonymisation).
 * Règles pures : `#lib/works/steps`.
 *
 * - Chaque mutation passe par `loadManagedWork` : verrou `work:` puis
 *   `band:` pour un morceau de groupe, existence et gestion relues après
 *   attente (ARCH-MET-02b). L'étape est relue sous ce verrou : deux
 *   demandes concurrentes sont sérialisées, la seconde voit la première.
 * - Le client envoie une **intention** (`claim`, `start`…) ; statut, dates,
 *   mode et lieu sont calculés ici. Une action rejouée n'ajoute aucun acte.
 * - Aucune écriture sur `recordedAt`, les crédits ni l'XP : une étape
 *   déclarée n'est pas une preuve. Sa lecture fait avancer la fiche, le
 *   parcours et les coups de pouce (`#lib/works/production`, DASH-06c).
 * - Lecture réservée à l'équipe du morceau ; historique à la gestion et à
 *   la personne responsable.
 */
import { prisma } from '#lib/server';
import {
	OPEN_WORK_STEP_KINDS,
	availableWorkStepActions,
	planWorkStep,
	staleWorkStep,
	type WorkStepActKindValue,
	type WorkStepForm,
	type WorkStepKindValue,
	type WorkStepStatusValue
} from '#lib/works/steps';
import { WorkError, loadManagedWork, workAccess } from './service';

const TX = { timeout: 20_000 } as const;
const HISTORY = 20;

/** Appliquer une intention sur une étape. `changed: false` : rien à faire. */
export async function applyWorkStep(
	workId: string,
	personId: string,
	form: WorkStepForm,
	now = new Date()
) {
	if (!OPEN_WORK_STEP_KINDS.includes(form.kind))
		throw new WorkError('Cette étape arrive bientôt : seul l’enregistrement est ouvert.');
	return prisma.$transaction(async (tx) => {
		await loadManagedWork(tx, workId, personId);
		const current = await tx.workStep.findUnique({
			where: { workId_kind: { workId, kind: form.kind } },
			select: {
				id: true,
				status: true,
				assigneeId: true,
				startedAt: true,
				doneAt: true,
				revision: true
			}
		});
		const plan = staleWorkStep(
			planWorkStep(current, form.action, personId, now, form.confirm),
			current?.revision ?? 0,
			form.revision
		);
		if (plan.kind === 'noop') return { changed: false };
		if (plan.kind === 'error') throw new WorkError(plan.message, plan.status);
		const { next } = plan;
		const step = await tx.workStep.upsert({
			where: { workId_kind: { workId, kind: form.kind } },
			create: { workId, kind: form.kind, ...next, revision: 1 },
			update: { ...next, revision: { increment: 1 } },
			select: { id: true }
		});
		await tx.workStepAct.create({
			data: {
				stepId: step.id,
				authorId: personId,
				// Libérer : l'acte garde la personne qui était responsable.
				assigneeId: plan.act === 'RELEASED' ? current!.assigneeId : next.assigneeId,
				kind: plan.act,
				fromStatus: current?.status ?? null,
				toStatus: next.status,
				occurredAt: now
			}
		});
		return { changed: true, act: plan.act };
	}, TX);
}

const who = (a: { displayName: string; deletedAt: Date | null } | null) =>
	a ? (a.deletedAt ? 'Compte supprimé' : a.displayName) : null;

/** Étapes ouvertes d'un morceau, pour son équipe ; `null` hors équipe. */
export async function workStepsFor(workId: string, viewerId: string) {
	const access = await workAccess(workId, viewerId);
	if (!access?.team) return null;
	const rows = await prisma.workStep.findMany({
		where: { workId, kind: { in: [...OPEN_WORK_STEP_KINDS] } },
		select: {
			kind: true,
			mode: true,
			place: true,
			status: true,
			assigneeId: true,
			startedAt: true,
			doneAt: true,
			revision: true,
			assignee: { select: { displayName: true, deletedAt: true } },
			acts: {
				orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
				take: HISTORY,
				select: {
					id: true,
					kind: true,
					occurredAt: true,
					author: { select: { displayName: true, deletedAt: true } },
					assigneeId: true
				}
			}
		}
	});
	// Responsables cités par les actes (colonne sans clé étrangère) : un compte
	// supprimé ou introuvable devient « Compte supprimé ».
	const cited = [
		...new Set(rows.flatMap((r) => r.acts.map((a) => a.assigneeId)).filter((v) => v !== null))
	];
	const names = new Map(
		(
			await prisma.actor.findMany({
				where: { id: { in: cited } },
				select: { id: true, displayName: true, deletedAt: true }
			})
		).map((a) => [a.id, a])
	);
	return OPEN_WORK_STEP_KINDS.map((kind) => {
		const row = rows.find((r) => r.kind === kind) ?? null;
		const state = row
			? {
					status: row.status as WorkStepStatusValue,
					assigneeId: row.assigneeId,
					startedAt: row.startedAt,
					doneAt: row.doneAt
				}
			: null;
		const mine = row?.assigneeId === viewerId;
		return {
			kind: kind as WorkStepKindValue,
			status: (row?.status ?? 'TODO') as WorkStepStatusValue,
			assigned: Boolean(row?.assigneeId),
			assignee: who(row?.assignee ?? null),
			mine,
			mode: row?.mode ?? null,
			place: row?.place ?? null,
			startedAt: row?.startedAt ?? null,
			doneAt: row?.doneAt ?? null,
			revision: row?.revision ?? 0,
			actions: availableWorkStepActions(state, viewerId, access.manage),
			// Historique : la gestion et la personne responsable seulement.
			history:
				row && (access.manage || mine)
					? row.acts.map((a) => ({
							id: a.id,
							kind: a.kind as WorkStepActKindValue,
							occurredAt: a.occurredAt,
							author: who(a.author) ?? 'Compte supprimé',
							assignee: a.assigneeId
								? (who(names.get(a.assigneeId) ?? null) ?? 'Compte supprimé')
								: null
						}))
					: []
		};
	});
}
export type WorkStepView = NonNullable<Awaited<ReturnType<typeof workStepsFor>>>[number];

/** Export RGPD : étapes dont je suis responsable et actes qui me concernent. */
export async function workStepsExport(personId: string) {
	const [steps, acts] = await Promise.all([
		prisma.workStep.findMany({
			where: { assigneeId: personId },
			select: {
				kind: true,
				mode: true,
				place: true,
				status: true,
				startedAt: true,
				doneAt: true,
				work: { select: { title: true } }
			}
		}),
		prisma.workStepAct.findMany({
			where: { OR: [{ authorId: personId }, { assigneeId: personId }] },
			orderBy: { occurredAt: 'asc' },
			select: {
				kind: true,
				fromStatus: true,
				toStatus: true,
				occurredAt: true,
				authorId: true,
				assigneeId: true,
				step: { select: { kind: true, work: { select: { title: true } } } }
			}
		})
	]);
	return {
		steps: steps.map(({ work, ...s }) => ({ ...s, work: work.title })),
		acts: acts.map(({ step, authorId, assigneeId, ...a }) => ({
			...a,
			step: step.kind,
			work: step.work.title,
			byMe: authorId === personId,
			aboutMe: assigneeId === personId
		}))
	};
}
