/**
 * Contestation et retrait des étapes de groupe (P3-06, conception 02 §4,
 * D49). Règles pures : `#lib/milestones/disputes`.
 *
 * - **Contester** (`contestMilestone`) : un signalement `MILESTONE` ; s'il
 *   vient d'une personne de confiance (palier 1 au moins), l'étape est
 *   **gelée** (`frozenAt`) : plus de preuve, affichée « En vérification ».
 * - **Retenir** (`upholdContest`, modération) : chaque gain lié à l'étape est
 *   repris par transaction négative liée (`reverseGain`, registre en ajout
 *   seul), l'événement `milestone.revoked` la retire du palier, la ligne est
 *   supprimée (le groupe pourra la redéclarer, avec de vraies preuves) ; qui
 *   l'a déclarée et qui l'a confirmée reçoivent un avertissement de
 *   confiance (`sanction`, palier recalculé).
 * - **Rejeter** (`dismissContest`) : dégel, et réévaluation des preuves
 *   arrivées entre-temps.
 * - **Retirer** soi-même (`retractMilestone`, gestion du groupe) : une étape
 *   déclarée par erreur, même reprise d'XP, sans avertissement ; pas pendant
 *   une vérification.
 *
 * Sous le verrou du groupe, comme les autres écritures d'étapes.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { logAdminAction } from '#lib/server/audit-log';
import { emitAndProcess, reverseGain } from '#lib/server/progression/processor';
import { fileReport, ModerationError, sanction } from '#lib/server/moderation/service';
import { milestoneDef, type MilestoneKey } from '#lib/milestones/rules';
import { normalizeDetails } from '#lib/moderation/rules';
import {
	CONTEST_ERRORS,
	contestRefusal,
	freezesOnReport,
	retractBlocker
} from '#lib/milestones/disputes';
import { evaluate } from './proofs';
import { lockBand, managedBand, MilestoneError } from './service';

type Tx = Prisma.TransactionClient;
type Moderator = { userId: string };
const TX = { timeout: 20_000 } as const;

async function head(db: Tx | typeof prisma, milestoneId: string) {
	const row = await db.milestone.findUnique({
		where: { id: milestoneId },
		select: {
			id: true,
			bandId: true,
			definitionId: true,
			frozenAt: true,
			declaredById: true,
			band: { select: { kind: true, organization: { select: { dissolvedAt: true } } } }
		}
	});
	if (!row) throw new MilestoneError('Cette étape n’existe plus.', 404);
	// Étape personnelle (P8, D77) : elle ne vient que d'un concert confirmé par
	// l'hôte et ne rapporte aucune XP propre ; elle ne passe pas par la
	// contestation des étapes de groupe (Q102 : un signalement à la modération).
	if (row.band.kind === 'PERSON') {
		throw new MilestoneError(
			'Cette étape vient d’un concert confirmé par le lieu : signale le profil à la modération.'
		);
	}
	return { ...row, key: row.definitionId as MilestoneKey };
}

/**
 * Contester une étape (signalement). Gèle l'étape si la personne est de
 * confiance. Renvoie `{ alreadyReported, frozen }`.
 */
export async function contestMilestone(
	reporterId: string,
	milestoneId: string,
	rawDetails: string
) {
	const row = await head(prisma, milestoneId);
	const details = normalizeDetails(rawDetails);
	const [member, reporter] = await Promise.all([
		prisma.membership.count({
			where: { orgId: row.bandId, personId: reporterId, status: 'ACTIVE' }
		}),
		prisma.actor.findUnique({ where: { id: reporterId }, select: { trustLevel: true } })
	]);
	const refusal = contestRefusal({ key: row.key, reporterIsMember: member > 0, details });
	if (refusal) throw new MilestoneError(CONTEST_ERRORS[refusal]);
	let alreadyReported: boolean;
	try {
		({ alreadyReported } = await fileReport(reporterId, {
			targetType: 'MILESTONE',
			targetId: milestoneId,
			reason: 'OTHER',
			details
		}));
	} catch (err) {
		if (err instanceof ModerationError) throw new MilestoneError(err.message);
		throw err;
	}
	const frozen = !alreadyReported && freezesOnReport(reporter?.trustLevel ?? 0);
	if (frozen) {
		await prisma.milestone.updateMany({
			where: { id: milestoneId, frozenAt: null },
			data: { frozenAt: new Date() }
		});
	}
	return { alreadyReported, frozen };
}

/**
 * Reprend l'XP de l'étape, émet `milestone.revoked` et supprime la ligne
 * (preuves comprises). Renvoie les transactions de reprise écrites.
 */
async function revoke(
	tx: Tx,
	row: { id: string; bandId: string; key: MilestoneKey },
	reason: 'contested' | 'retracted',
	label: string,
	now: Date
) {
	const events = await tx.domainEvent.findMany({
		where: {
			type: 'milestone.attested',
			actorIds: { has: row.bandId },
			payload: { path: ['milestone'], equals: row.key }
		},
		select: { id: true, payload: true }
	});
	const mine = events.filter(
		(e) => (e.payload as { bandId?: string } | null)?.bandId === row.bandId
	);
	const gains = await tx.xpTransaction.findMany({
		where: {
			sourceEventId: { in: mine.map((e) => e.id) },
			reversesId: null,
			reversedBy: null
		},
		select: { id: true }
	});
	const reversals = [];
	for (const g of gains) {
		const r = await reverseGain(tx, g.id, label);
		if (r) reversals.push(r);
	}
	const memberIds = [
		...new Set(mine.flatMap((e) => (e.payload as { memberIds?: string[] }).memberIds ?? []))
	];
	await emitAndProcess(tx, {
		type: 'milestone.revoked',
		bandId: row.bandId,
		milestone: row.key,
		memberIds,
		reason,
		occurredAt: now
	});
	await tx.milestone.delete({ where: { id: row.id } });
	return reversals;
}

async function closeMilestoneReports(
	tx: Tx,
	milestoneId: string,
	status: 'ACTIONED' | 'DISMISSED',
	note: string,
	by: Moderator,
	now: Date
) {
	return tx.report.updateMany({
		where: { targetType: 'MILESTONE', targetId: milestoneId, status: 'OPEN' },
		data: { status, handledByUserId: by.userId, handledAt: now, decisionNote: note || null }
	});
}

/**
 * Contestation retenue : XP reprise, étape retirée, avertissement de
 * confiance pour qui l'a déclarée et pour chaque personne qui l'a confirmée.
 */
export async function upholdContest(
	milestoneId: string,
	note: string,
	by: Moderator,
	now = new Date()
) {
	const reason = note.trim();
	if (!reason)
		throw new MilestoneError('Explique en une phrase pourquoi la contestation est retenue.');
	const { warned, reversals, bandId } = await prisma.$transaction(async (tx) => {
		const row = await head(tx, milestoneId);
		await lockBand(tx, row.bandId);
		const open = await tx.report.count({
			where: { targetType: 'MILESTONE', targetId: milestoneId, status: 'OPEN' }
		});
		if (open === 0) throw new MilestoneError('Aucune contestation en attente pour cette étape.');
		const confirmers = await tx.milestoneAttestation.findMany({
			where: { milestoneId, status: 'CONFIRMED' },
			select: { attesterId: true }
		});
		const label = `${milestoneDef(row.key).label} contestée`;
		const reversals = await revoke(tx, row, 'contested', label, now);
		await closeMilestoneReports(tx, milestoneId, 'ACTIONED', reason, by, now);
		const warned = [
			...new Set([
				...(row.declaredById ? [row.declaredById] : []),
				...confirmers.map((c) => c.attesterId)
			])
		];
		return { warned, reversals, bandId: row.bandId };
	}, TX);
	// Avertissements (30 jours, palier recalculé), hors de la transaction :
	// `sanction` écrit, journalise et recalcule la confiance elle-même.
	for (const actorId of warned) {
		await sanction(
			actorId,
			{ kind: 'WARNING', reason: `Étape de groupe contestée : ${reason}`, days: null },
			by
		);
	}
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.milestone.uphold',
		targetType: 'Milestone',
		targetId: milestoneId,
		metadata: { bandId, reason, warned, reversals: reversals.map((r) => r.id) }
	});
	return { warned, reversals };
}

/** Contestation rejetée : l'étape est dégelée et ses preuves réévaluées. */
export async function dismissContest(
	milestoneId: string,
	note: string,
	by: Moderator,
	now = new Date()
) {
	await prisma.$transaction(async (tx) => {
		const row = await head(tx, milestoneId);
		await lockBand(tx, row.bandId);
		const { count } = await closeMilestoneReports(tx, milestoneId, 'DISMISSED', note, by, now);
		if (count === 0) throw new MilestoneError('Aucune contestation en attente pour cette étape.');
		await tx.milestone.update({ where: { id: milestoneId }, data: { frozenAt: null } });
		await evaluate(tx, milestoneId, now);
	}, TX);
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.milestone.dismiss',
		targetType: 'Milestone',
		targetId: milestoneId,
		metadata: note ? { note } : undefined
	});
}

/** La gestion du groupe retire une étape déclarée par erreur (XP reprise). */
export async function retractMilestone(milestoneId: string, managerId: string, now = new Date()) {
	await prisma.$transaction(async (tx) => {
		const row = await head(tx, milestoneId);
		await lockBand(tx, row.bandId);
		const band = await managedBand(tx, row.bandId, managerId);
		const blocker = retractBlocker({
			key: row.key,
			frozen: row.frozenAt !== null,
			dissolved: band.dissolvedAt !== null
		});
		if (blocker) throw new MilestoneError(blocker);
		await revoke(tx, row, 'retracted', `${milestoneDef(row.key).label} retirée par le groupe`, now);
	}, TX);
}

/** File de la modération : étapes contestées, avec leurs signalements et preuves. */
export async function disputeQueue() {
	const reports = await prisma.report.findMany({
		where: { targetType: 'MILESTONE', status: 'OPEN' },
		orderBy: { createdAt: 'asc' },
		take: 100,
		select: {
			id: true,
			targetId: true,
			details: true,
			createdAt: true,
			reporter: { select: { handle: true, trustLevel: true } }
		}
	});
	const ids = [...new Set(reports.map((r) => r.targetId))];
	if (ids.length === 0) return [];
	const milestones = await prisma.milestone.findMany({
		where: { id: { in: ids } },
		select: {
			id: true,
			definitionId: true,
			proof: true,
			occurredAt: true,
			note: true,
			frozenAt: true,
			band: { select: { handle: true, displayName: true } },
			declaredBy: { select: { handle: true, displayName: true } },
			attestations: {
				where: { status: 'CONFIRMED' },
				select: { role: true, attester: { select: { handle: true, displayName: true } } }
			},
			evidence: { select: { kind: true, url: true, status: true } }
		}
	});
	return milestones.map((m) => ({
		id: m.id,
		label: milestoneDef(m.definitionId as MilestoneKey).label,
		proof: m.proof,
		occurredAt: m.occurredAt,
		note: m.note,
		frozen: m.frozenAt !== null,
		band: m.band,
		declaredBy: m.declaredBy,
		confirmedBy: m.attestations.map((a) => ({ role: a.role, ...a.attester })),
		evidence: m.evidence,
		reports: reports
			.filter((r) => r.targetId === m.id)
			.map((r) => ({
				id: r.id,
				details: r.details,
				createdAt: r.createdAt,
				reporter: r.reporter.handle,
				reporterTrust: r.reporter.trustLevel
			}))
	}));
}
export type DisputedMilestone = Awaited<ReturnType<typeof disputeQueue>>[number];
