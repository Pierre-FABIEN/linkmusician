/**
 * Production d'un morceau (DASH-06c, #53, D70) : lit les étapes prises en
 * charge pour les passer à `#lib/works/production`, seule règle qui réunit
 * faits de collaboration et réalisations déclarées. Lecture seule : rien
 * n'est écrit, aucun événement, aucune XP.
 *
 * Les étapes sont privées à l'équipe du morceau (D68) : l'appelant ne lit
 * ces faits que pour un lecteur de l'équipe.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import type { StepFact } from '#lib/works/production';
import type { WorkStepKindValue, WorkStepStatusValue } from '#lib/works/steps';

type Db = Prisma.TransactionClient | typeof prisma;

/** Étapes prises en charge de plusieurs morceaux, par morceau. */
export async function stepFactsOf(
	workIds: readonly string[],
	db: Db = prisma
): Promise<Map<string, StepFact[]>> {
	const out = new Map<string, StepFact[]>(workIds.map((id) => [id, []]));
	if (workIds.length === 0) return out;
	const rows = await db.workStep.findMany({
		where: { workId: { in: [...workIds] } },
		select: {
			workId: true,
			kind: true,
			status: true,
			assigneeId: true,
			doneAt: true,
			assignee: { select: { displayName: true, deletedAt: true } }
		}
	});
	for (const r of rows) {
		out.get(r.workId)?.push({
			kind: r.kind as WorkStepKindValue,
			status: r.status as WorkStepStatusValue,
			assigned: r.assigneeId !== null,
			doneAt: r.doneAt,
			assignee: r.assignee
				? r.assignee.deletedAt
					? 'Compte supprimé'
					: r.assignee.displayName
				: null
		});
	}
	return out;
}

export async function stepFactsFor(workId: string, db: Db = prisma) {
	return (await stepFactsOf([workId], db)).get(workId) ?? [];
}
