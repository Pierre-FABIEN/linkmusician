/**
 * Modération (P1-12) : signalements, file d'attente, décisions. Chaque décision
 * est tracée dans le journal d'audit du boilerplate (`AdminAuditLog`) et fait
 * recalculer la confiance de la personne visée.
 */
import { prisma } from '#lib/server';
import { logAdminAction } from '#lib/server/audit-log';
import { RefillingTokenBucket } from '#lib/server/rate-limit';
import { recomputeTrust } from '#lib/server/progression/trust';
import { reverseGain } from '#lib/server/progression/processor';
import { publishMedia } from '#lib/server/media/service';
import { destroyAsset } from '#lib/server/media/cloudinary';
import type { UploadKind } from '#lib/media/upload';
import {
	activeSuspension,
	addDays,
	DAILY_REPORTS,
	normalizeDetails,
	REPORT_REASONS,
	WARNING_DAYS,
	type ReportReasonValue
} from '#lib/moderation/rules';

export class ModerationError extends Error {}

const reportBucket = new RefillingTokenBucket<string>(
	DAILY_REPORTS,
	Math.ceil(86400 / DAILY_REPORTS),
	'reports'
);

/* -------------------------------------------------------------------------- */
/*  Signalements                                                              */
/* -------------------------------------------------------------------------- */

export async function fileReport(
	reporterActorId: string,
	input: {
		targetType: 'ACTOR' | 'MEDIA' | 'OPPORTUNITY' | 'VENUE' | 'MILESTONE';
		targetId: string;
		reason: string;
		details?: string;
	}
) {
	if (!(REPORT_REASONS as readonly string[]).includes(input.reason)) {
		throw new ModerationError('Choisis un motif.');
	}
	let targetActorId: string | null = null;
	if (input.targetType === 'MEDIA') {
		const media = await prisma.media.findUnique({
			where: { id: input.targetId },
			select: { actorId: true }
		});
		targetActorId = media?.actorId ?? null;
	} else if (input.targetType === 'OPPORTUNITY') {
		// Annonce (P2-02) : l'acteur visé est son auteur ; pour une annonce de
		// groupe (P3-03), la personne qui l'a publiée.
		const opportunity = await prisma.opportunity.findUnique({
			where: { id: input.targetId },
			select: { issuerActorId: true, postedById: true }
		});
		targetActorId = opportunity ? (opportunity.postedById ?? opportunity.issuerActorId) : null;
	} else if (input.targetType === 'VENUE') {
		// Lieu de l'annuaire (P2-14a) : l'acteur visé est la personne qui l'a ajouté.
		const venue = await prisma.venue.findFirst({
			where: { id: input.targetId, removedAt: null },
			select: { createdById: true }
		});
		targetActorId = venue?.createdById ?? null;
	} else if (input.targetType === 'MILESTONE') {
		// Étape de groupe (P3-06) : la personne qui l'a déclarée, sinon le groupe.
		// Passe par `contestMilestone` (gel, règles), jamais directement.
		const milestone = await prisma.milestone.findUnique({
			where: { id: input.targetId },
			select: { declaredById: true, bandId: true }
		});
		targetActorId = milestone ? (milestone.declaredById ?? milestone.bandId) : null;
	} else {
		const actor = await prisma.actor.findFirst({
			where: { id: input.targetId, deletedAt: null },
			select: { id: true }
		});
		targetActorId = actor?.id ?? null;
	}
	if (!targetActorId) throw new ModerationError('Contenu introuvable.');
	if (targetActorId === reporterActorId)
		throw new ModerationError('Tu ne peux pas te signaler toi-même.');

	const existing = await prisma.report.findUnique({
		where: {
			reporterActorId_targetType_targetId: {
				reporterActorId,
				targetType: input.targetType,
				targetId: input.targetId
			}
		}
	});
	if (existing) return { alreadyReported: true };
	if (!(await reportBucket.consume(reporterActorId, 1))) {
		throw new ModerationError('Trop de signalements aujourd’hui. Réessaie demain.');
	}
	await prisma.report.create({
		data: {
			reporterActorId,
			targetType: input.targetType,
			targetId: input.targetId,
			targetActorId,
			reason: input.reason as ReportReasonValue,
			details: normalizeDetails(input.details ?? '') || null
		}
	});
	return { alreadyReported: false };
}

/* -------------------------------------------------------------------------- */
/*  File d'attente                                                            */
/* -------------------------------------------------------------------------- */

export async function moderationQueue() {
	const [pendingMedia, openReports, pendingVenues] = await Promise.all([
		prisma.media.findMany({
			where: { status: 'PENDING_REVIEW' },
			orderBy: { createdAt: 'asc' },
			take: 50,
			include: { actor: { select: { handle: true, displayName: true } } }
		}),
		// Les étapes contestées ont leur section (P3-06, `disputeQueue`).
		prisma.report.findMany({
			where: { status: 'OPEN', targetType: { not: 'MILESTONE' } },
			orderBy: { createdAt: 'asc' },
			take: 50,
			include: {
				reporter: { select: { handle: true } },
				targetActor: { select: { id: true, handle: true, displayName: true } }
			}
		}),
		// Lieux ajoutés par un compte TL0, en attente (P2-14c, D26).
		prisma.venue.findMany({
			where: { validatedAt: null, removedAt: null },
			orderBy: { createdAt: 'asc' },
			take: 50,
			select: {
				id: true,
				name: true,
				kind: true,
				communeName: true,
				createdAt: true,
				createdBy: { select: { handle: true } }
			}
		})
	]);
	const mediaIds = openReports.filter((r) => r.targetType === 'MEDIA').map((r) => r.targetId);
	const opportunityIds = openReports
		.filter((r) => r.targetType === 'OPPORTUNITY')
		.map((r) => r.targetId);
	const venueIds = openReports.filter((r) => r.targetType === 'VENUE').map((r) => r.targetId);
	const milestoneIds = openReports
		.filter((r) => r.targetType === 'MILESTONE')
		.map((r) => r.targetId);
	const [reportedMedia, reportedOpportunities, reportedVenues, reportedMilestones] = await Promise.all([
		prisma.media.findMany({ where: { id: { in: mediaIds } } }),
		prisma.opportunity.findMany({
			where: { id: { in: opportunityIds } },
			select: { id: true, title: true, description: true, status: true }
		}),
		prisma.venue.findMany({
			where: { id: { in: venueIds } },
			select: { id: true, name: true, kind: true, communeName: true, removedAt: true }
		}),
		prisma.milestone.findMany({
			where: { id: { in: milestoneIds } },
			select: {
				id: true,
				definitionId: true,
				proof: true,
				occurredAt: true,
				band: { select: { handle: true, displayName: true } }
			}
		})
	]);
	const venueById = new Map(reportedVenues.map((v) => [v.id, v]));
	const byId = new Map(reportedMedia.map((m) => [m.id, m]));
	const opportunityById = new Map(reportedOpportunities.map((o) => [o.id, o]));
	const milestoneById = new Map(reportedMilestones.map((m) => [m.id, m]));
	return {
		pendingMedia,
		pendingVenues,
		openReports: openReports.map((r) => ({
			...r,
			media: r.targetType === 'MEDIA' ? (byId.get(r.targetId) ?? null) : null,
			opportunity:
				r.targetType === 'OPPORTUNITY' ? (opportunityById.get(r.targetId) ?? null) : null,
			venue: r.targetType === 'VENUE' ? (venueById.get(r.targetId) ?? null) : null,
			milestone:
				r.targetType === 'MILESTONE' ? (milestoneById.get(r.targetId) ?? null) : null
		}))
	};
}

/* -------------------------------------------------------------------------- */
/*  Décisions                                                                 */
/* -------------------------------------------------------------------------- */

type Moderator = { userId: string };

async function refreshTrust(actorId: string) {
	await prisma.$transaction((tx) => recomputeTrust(tx, [actorId]));
}

async function closeReports(
	where: { targetType: 'ACTOR' | 'MEDIA' | 'OPPORTUNITY' | 'VENUE' | 'MILESTONE'; targetId: string },
	by: Moderator,
	note: string,
	status: 'ACTIONED' | 'DISMISSED'
) {
	await prisma.report.updateMany({
		where: { ...where, status: 'OPEN' },
		data: { status, handledByUserId: by.userId, handledAt: new Date(), decisionNote: note }
	});
}

export async function approveMedia(mediaId: string, by: Moderator) {
	const media = await prisma.media.findUnique({ where: { id: mediaId } });
	if (!media || media.status !== 'PENDING_REVIEW')
		throw new ModerationError('Ce média n’est plus en attente.');
	const progress = await publishMedia(mediaId);
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.media.approve',
		targetType: 'Media',
		targetId: mediaId
	});
	return progress;
}

/** Refuse ou retire un média (fichier supprimé), et clôt ses signalements. */
export async function rejectMedia(mediaId: string, reason: string, by: Moderator) {
	const media = await prisma.media.findUnique({ where: { id: mediaId } });
	if (!media) throw new ModerationError('Média introuvable.');
	await prisma.media.update({
		where: { id: mediaId },
		data: { status: 'REJECTED', rejectionReason: reason || 'Refusé par la modération.' }
	});
	if (media.provider === 'CLOUDINARY' && media.providerId)
		await destroyAsset(media.providerId, media.kind as UploadKind);
	await closeReports(
		{ targetType: 'MEDIA', targetId: mediaId },
		by,
		`Média retiré : ${reason}`,
		'ACTIONED'
	);
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.media.reject',
		targetType: 'Media',
		targetId: mediaId,
		metadata: { reason }
	});
	await refreshTrust(media.actorId);
}

export async function dismissReport(reportId: string, note: string, by: Moderator) {
	const { count } = await prisma.report.updateMany({
		where: { id: reportId, status: 'OPEN' },
		data: {
			status: 'DISMISSED',
			handledByUserId: by.userId,
			handledAt: new Date(),
			decisionNote: note || null
		}
	});
	if (count === 0) throw new ModerationError('Ce signalement est déjà traité.');
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.report.dismiss',
		targetType: 'Report',
		targetId: reportId
	});
}

/** Une étape de groupe est contestée : on la gèle et on annule les gains liés si la modération la juge invalide. */
export async function reviewMilestoneContest(
	milestoneId: string,
	accepted: boolean,
	by: Moderator,
	note = 'Décision de modération.'
) {
	const milestoneRow = await prisma.milestone.findUnique({
		where: { id: milestoneId },
		select: { id: true, bandId: true, declaredById: true, proof: true, definitionId: true }
	});
	if (!milestoneRow) throw new ModerationError('Étape introuvable.');
	const when = new Date();
	await prisma.$transaction(async (tx) => {
		if (accepted) {
			await tx.milestone.update({
				where: { id: milestoneId },
				data: { frozenAt: when, frozenByUserId: by.userId }
			});
			await tx.milestoneAttestation.updateMany({
				where: { milestoneId },
				data: { frozenAt: when }
			});
			const events = await tx.domainEvent.findMany({
				where: {
					type: 'milestone.attested',
					payload: { path: ['bandId'], equals: milestoneRow.bandId }
				},
				select: { id: true, payload: true }
			});
			for (const event of events) {
				const payload = event.payload as { milestone?: string; bandId?: string } | null;
				if (payload?.milestone !== milestoneRow.definitionId) continue;
				const transactions = await tx.xpTransaction.findMany({
					where: { sourceEventId: event.id, reversedBy: null, reversesId: null },
					select: { id: true }
				});
				for (const row of transactions) {
					await reverseGain(tx, row.id, note || 'Étape contestée et invalidée.');
				}
			}
			await closeReports(
				{ targetType: 'MILESTONE', targetId: milestoneId },
				by,
				`Étape invalidée : ${note}`,
				'ACTIONED'
			);
			await logAdminAction({
				actorId: by.userId,
				action: 'moderation.milestone.reject',
				targetType: 'Milestone',
				targetId: milestoneId,
				metadata: { reason: note }
			});
			return;
		}
		await tx.milestone.update({
			where: { id: milestoneId },
			data: { frozenAt: null, frozenByUserId: null }
		});
		await tx.milestoneAttestation.updateMany({
			where: { milestoneId },
			data: { frozenAt: null }
		});
		await closeReports(
			{ targetType: 'MILESTONE', targetId: milestoneId },
			by,
			`Étape dégelée : ${note}`,
			'DISMISSED'
		);
		await logAdminAction({
			actorId: by.userId,
			action: 'moderation.milestone.dismiss',
			targetType: 'Milestone',
			targetId: milestoneId,
			metadata: { reason: note }
		});
	});
	await refreshTrust(milestoneRow.bandId);
	if (milestoneRow.declaredById) await refreshTrust(milestoneRow.declaredById);
	return { accepted };
}

/** Avertit ou suspend un acteur ; clôt le signalement d'origine s'il y en a un. */
export async function sanction(
	actorId: string,
	input: {
		kind: 'WARNING' | 'SUSPENSION';
		reason: string;
		days: number | null;
		reportId?: string | null;
	},
	by: Moderator
) {
	if (!input.reason.trim()) throw new ModerationError('Indique le motif de la sanction.');
	const now = new Date();
	const until =
		input.kind === 'WARNING'
			? addDays(now, WARNING_DAYS)
			: input.days
				? addDays(now, input.days)
				: null;
	const created = await prisma.sanction.create({
		data: {
			actorId,
			kind: input.kind,
			reason: input.reason.trim(),
			until,
			reportId: input.reportId || null,
			createdByUserId: by.userId
		}
	});
	if (input.reportId) {
		await prisma.report.updateMany({
			where: { id: input.reportId, status: 'OPEN' },
			data: {
				status: 'ACTIONED',
				handledByUserId: by.userId,
				handledAt: now,
				decisionNote: `${input.kind} : ${input.reason}`
			}
		});
	}
	await logAdminAction({
		actorId: by.userId,
		action: `moderation.sanction.${input.kind.toLowerCase()}`,
		targetType: 'Actor',
		targetId: actorId,
		metadata: { reason: input.reason, until }
	});
	await refreshTrust(actorId);
	return created;
}

export async function liftSanction(sanctionId: string, by: Moderator) {
	const s = await prisma.sanction.update({
		where: { id: sanctionId },
		data: { liftedAt: new Date() }
	});
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.sanction.lift',
		targetType: 'Sanction',
		targetId: sanctionId
	});
	await refreshTrust(s.actorId);
}

/** Suspension en vigueur d'un acteur, ou `null`. */
export async function currentSuspension(actorId: string) {
	const sanctions = await prisma.sanction.findMany({
		where: { actorId, kind: 'SUSPENSION', liftedAt: null }
	});
	return activeSuspension(sanctions);
}

/** Retire une annonce (P2-02) et clôt ses signalements. */
export async function removeOpportunity(opportunityId: string, reason: string, by: Moderator) {
	const opportunity = await prisma.opportunity.findUnique({
		where: { id: opportunityId },
		select: { issuerActorId: true, postedById: true }
	});
	if (!opportunity) throw new ModerationError('Annonce introuvable.');
	await prisma.opportunity.update({
		where: { id: opportunityId },
		data: { status: 'REMOVED', closedAt: new Date() }
	});
	await closeReports(
		{ targetType: 'OPPORTUNITY', targetId: opportunityId },
		by,
		`Annonce retirée : ${reason}`,
		'ACTIONED'
	);
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.opportunity.remove',
		targetType: 'Opportunity',
		targetId: opportunityId,
		metadata: { reason }
	});
	// Annonce de groupe (P3-03) : c'est la confiance de la personne qui l'a publiée.
	await refreshTrust(opportunity.postedById ?? opportunity.issuerActorId);
}

/** Valide un lieu en attente (P2-14c, D26) : visible de tous, il accueille des jams. */
export async function validateVenue(venueId: string, by: Moderator) {
	const { count } = await prisma.venue.updateMany({
		where: { id: venueId, validatedAt: null, removedAt: null },
		data: { validatedAt: new Date() }
	});
	if (count === 0) throw new ModerationError('Lieu introuvable ou déjà validé.');
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.venue.validate',
		targetType: 'Venue',
		targetId: venueId
	});
}

/** Retire un lieu de l'annuaire (P2-14a) et clôt ses signalements. */
export async function removeVenue(venueId: string, reason: string, by: Moderator) {
	const venue = await prisma.venue.findUnique({
		where: { id: venueId },
		select: { createdById: true }
	});
	if (!venue) throw new ModerationError('Lieu introuvable.');
	await prisma.venue.update({ where: { id: venueId }, data: { removedAt: new Date() } });
	await closeReports(
		{ targetType: 'VENUE', targetId: venueId },
		by,
		`Lieu retiré : ${reason}`,
		'ACTIONED'
	);
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.venue.remove',
		targetType: 'Venue',
		targetId: venueId,
		metadata: { reason }
	});
	await refreshTrust(venue.createdById);
}

/* -------------------------------------------------------------------------- */
/*  Cercles fermés (P2-10)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Cas ouverts par le job de collusion, les plus suspects d'abord (adresses
 * IP partagées, puis volume d'échanges). Membres avec leur palier et leurs
 * collaborations confirmées, pour juger d'un coup d'œil.
 */
export async function collusionQueue() {
	const cases = await prisma.collusionCase.findMany({
		where: { status: 'OPEN' },
		orderBy: [{ sharedIps: 'desc' }, { interactions: 'desc' }, { detectedAt: 'asc' }],
		take: 50
	});
	const ids = [...new Set(cases.flatMap((c) => c.memberIds))];
	const actors = await prisma.actor.findMany({
		where: { id: { in: ids } },
		select: { id: true, handle: true, displayName: true, trustLevel: true, createdAt: true }
	});
	const byId = new Map(actors.map((a) => [a.id, a]));
	return cases.map((c) => ({
		id: c.id,
		interactions: c.interactions,
		density: c.density,
		sharedIps: c.sharedIps,
		detectedAt: c.detectedAt,
		lastSeenAt: c.lastSeenAt,
		members: c.memberIds.flatMap((id) => {
			const a = byId.get(id);
			return a ? [a] : [];
		})
	}));
}

/** Trancher un cas : rien d'anormal (`DISMISSED`) ou collusion confirmée. */
export async function decideCollusion(
	caseId: string,
	decision: 'DISMISSED' | 'CONFIRMED',
	note: string,
	by: Moderator
) {
	if (decision === 'CONFIRMED' && !note) {
		throw new ModerationError('Explique en une phrase ce qui confirme la collusion.');
	}
	const { count } = await prisma.collusionCase.updateMany({
		where: { id: caseId, status: 'OPEN' },
		data: {
			status: decision,
			handledByUserId: by.userId,
			handledAt: new Date(),
			decisionNote: note || null
		}
	});
	if (count === 0) throw new ModerationError('Ce cas est déjà traité.');
	await logAdminAction({
		actorId: by.userId,
		action:
			decision === 'CONFIRMED' ? 'moderation.collusion.confirm' : 'moderation.collusion.dismiss',
		targetType: 'CollusionCase',
		targetId: caseId
	});
}
