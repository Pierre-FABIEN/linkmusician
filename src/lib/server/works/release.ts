/**
 * P1 (E10, #36) : libérer les étapes `WorkStep` d'une personne qui perd la
 * gestion d'un morceau. Avec `steps.ts`, seul point d'écriture de
 * `work_steps` et `work_step_acts`. Règle pure : `planAccessLossRelease`.
 *
 * **Invariant** : aucune étape non terminée n'est au nom d'une personne qui
 * ne gère plus le morceau. Une étape terminée reste intacte, à son nom ; les
 * crédits, collaborations, preuves et l'XP ne sont jamais touchés.
 *
 * Verrous (§6.7, ARCH-MET-02) :
 * - Groupe (`releaseStepsOnBandExit`) : appelé **dans la transaction** du
 *   départ, du retrait ou de la rétrogradation, qui tient déjà `band:`. Toute
 *   écriture d'étape d'un morceau de groupe (`loadManagedWork`) prend
 *   `work:` puis `band:` **avant** de relire l'étape : tenir `band:` suffit à
 *   la sérialiser, sans prendre `work:` après `band:` (ordre inversé). Une
 *   prise en charge concurrente attend `band:`, puis relit la gestion
 *   perdue ; une prise en charge déjà passée est vue ici, puis libérée.
 * - Compte supprimé (`stepReleaseOnErasureOps`) : la transaction
 *   d'anonymisation verrouille d'abord, triés, les morceaux concernés.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { qualifiedTable } from '#lib/server/db-schema';
import { planAccessLossRelease, type WorkStepStatusValue } from '#lib/works/steps';
import { manageableOwnerWhere } from './access';

type Tx = Prisma.TransactionClient;

/**
 * Sous `band:` (tenu par l'appelant), après le changement d'adhésion : libère
 * les étapes non terminées de `personId` sur les morceaux du groupe, si elle
 * n'en a plus la gestion. Une gestion encore valide (autre rôle, nouvelle
 * adhésion) ne libère rien. Idempotent : un rejeu ne trouve plus rien.
 * `authorId` : qui a provoqué la perte (la personne elle-même ou la gestion).
 */
export async function releaseStepsOnBandExit(
	tx: Tx,
	input: { bandId: string; personId: string; authorId: string },
	now: Date
): Promise<number> {
	const { bandId, personId, authorId } = input;
	const steps = await tx.workStep.findMany({
		where: { assigneeId: personId, status: { not: 'DONE' }, work: { ownerId: bandId } },
		orderBy: { id: 'asc' },
		select: { id: true, status: true, assigneeId: true, startedAt: true, doneAt: true }
	});
	if (steps.length === 0) return 0;
	const stillManages = await tx.actor.count({
		where: { id: bandId, ...manageableOwnerWhere(personId) }
	});
	if (stillManages > 0) return 0;
	let released = 0;
	for (const step of steps) {
		const plan = planAccessLossRelease(
			{ ...step, status: step.status as WorkStepStatusValue },
			personId
		);
		if (plan.kind !== 'apply') continue;
		// Garde relue à l'écriture : rien n'est libéré deux fois.
		const { count } = await tx.workStep.updateMany({
			where: { id: step.id, assigneeId: personId, status: { not: 'DONE' } },
			data: { ...plan.next, revision: { increment: 1 } }
		});
		if (count === 0) continue;
		await tx.workStepAct.create({
			data: {
				stepId: step.id,
				authorId,
				assigneeId: personId,
				kind: plan.act,
				fromStatus: step.status,
				toStatus: plan.next.status,
				occurredAt: now
			}
		});
		released += 1;
	}
	return released;
}

/**
 * Suppression de compte : opérations à placer **en tête** de la transaction
 * d'anonymisation (`personAnonymizationOps`). Verrouille les morceaux où la
 * personne a une étape ou qu'elle gère par un groupe (triés, `work:` avant
 * tout autre verrou), historise puis libère ses étapes non terminées, et
 * retire son nom des étapes terminées (« Compte supprimé »), qui restent
 * terminées. Les actes n'ont ni auteur ni responsable : tout est oublié.
 */
export async function stepReleaseOnErasureOps(
	personId: string,
	now = new Date()
): Promise<Prisma.PrismaPromise<unknown>[]> {
	const [assigned, managed] = await Promise.all([
		prisma.workStep.findMany({
			where: { assigneeId: personId },
			distinct: ['workId'],
			select: { workId: true }
		}),
		prisma.work.findMany({
			where: { owner: { kind: 'ORGANIZATION', ...manageableOwnerWhere(personId) } },
			select: { id: true }
		})
	]);
	const workIds = [...new Set([...assigned.map((s) => s.workId), ...managed.map((w) => w.id)])];
	workIds.sort();
	const steps = qualifiedTable('work_steps');
	const acts = qualifiedTable('work_step_acts');
	const actKind = qualifiedTable('WorkStepActKind');
	const status = qualifiedTable('WorkStepStatus');
	return [
		...workIds.map(
			(id) => prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`work:${id}`}))`
		),
		// Un acte par étape libérée, dans la même instruction que sa sélection.
		prisma.$executeRaw`
			INSERT INTO ${acts} ("id", "stepId", "authorId", "assigneeId", "kind", "fromStatus", "toStatus", "occurredAt")
			SELECT gen_random_uuid()::text, s."id", NULL, NULL, 'AUTO_RELEASED'::${actKind},
				s."status", 'TODO'::${status}, ${now}
			FROM ${steps} s
			WHERE s."assigneeId" = ${personId} AND s."status" <> 'DONE'::${status}`,
		prisma.workStep.updateMany({
			where: { assigneeId: personId, status: { not: 'DONE' } },
			data: {
				status: 'TODO',
				assigneeId: null,
				startedAt: null,
				doneAt: null,
				mode: null,
				place: null,
				revision: { increment: 1 }
			}
		}),
		prisma.workStep.updateMany({
			where: { assigneeId: personId },
			data: { assigneeId: null }
		})
	];
}
