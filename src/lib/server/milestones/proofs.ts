/**
 * Preuves des étapes de groupe (P3-05, D43), seul point d'écriture de
 * `MilestoneAttestation` et `MilestoneEvidence`. Règles pures :
 * `#lib/milestones/proofs`.
 *
 * - La gestion du groupe **demande** une confirmation à quelqu'un (un autre
 *   membre présent ce jour-là, ou une personne hors groupe TL1) et **joint
 *   des liens** (événement, écoute, extrait).
 * - La personne sollicitée **confirme** ou dit « je n'y étais pas » depuis
 *   `/etapes/[id]`. Une confirmation émet `milestone.attestation_confirmed`
 *   (sans XP, pour la détection des cercles fermés).
 * - Un lien d'écoute (démo publique) attend la modération.
 * - Dès que la règle de l'étape est remplie, l'étape passe de « déclarée »
 *   à « corroborée » : `milestone.attested` verse la différence d'XP.
 *
 * Sous le verrou du groupe, comme les autres écritures d'étapes.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { isIndexable } from '#lib/actors/visibility';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { canInviteMinor } from '#lib/server/bands/service';
import { notify } from '#lib/server/notifications/service';
import { emitAndProcess } from '#lib/server/progression/processor';
import { logAdminAction } from '#lib/server/audit-log';
import { creditDate, membersAt, milestoneDef, type MilestoneKey } from '#lib/milestones/rules';
import {
	attesterBlocker,
	checkEvidenceUrl,
	corroborationMet,
	MAX_EVIDENCE,
	MAX_PENDING_ATTESTATIONS,
	MIN_OUTSIDER_TRUST,
	proofChecklist,
	proofRule
} from '#lib/milestones/proofs';
import { attest, lockBand, managedBand, MilestoneError } from './service';
import { verifyMusicBrainzDemo } from './release-verification';

type Tx = Prisma.TransactionClient;
const TX = { timeout: 20_000 } as const;

async function milestoneHead(tx: Tx, milestoneId: string) {
	const row = await tx.milestone.findUnique({
		where: { id: milestoneId },
		select: {
			id: true,
			bandId: true,
			definitionId: true,
			proof: true,
			occurredAt: true,
			declaredById: true,
			band: { select: { displayName: true, organization: { select: { formedAt: true } } } }
		}
	});
	if (!row) throw new MilestoneError('Cette étape n’existe plus.', 404);
	return { ...row, key: row.definitionId as MilestoneKey };
}

async function bandPeriods(tx: Tx, bandId: string) {
	return tx.membership.findMany({
		where: { orgId: bandId, status: { in: ['ACTIVE', 'LEFT', 'REMOVED'] } },
		select: { personId: true, startedAt: true, endedAt: true }
	});
}

/**
 * La règle de l'étape est-elle remplie ? Si oui, l'étape déclarée devient
 * corroborée (XP différentielle). Renvoie le résultat du moteur, ou `null`.
 */
async function evaluate(tx: Tx, milestoneId: string, now: Date) {
	const row = await tx.milestone.findUnique({
		where: { id: milestoneId },
		select: {
			bandId: true,
			definitionId: true,
			proof: true,
			occurredAt: true,
			band: { select: { organization: { select: { formedAt: true } } } },
			attestations: { select: { role: true, status: true } },
			evidence: { select: { kind: true, status: true } }
		}
	});
	const formedAt = row?.band.organization?.formedAt;
	if (!row || row.proof !== 'DECLARED' || !formedAt) return null;
	const key = row.definitionId as MilestoneKey;
	if (!corroborationMet(key, row)) return null;
	await tx.milestone.update({ where: { id: milestoneId }, data: { proof: 'CORROBORATED' } });
	return attest(tx, {
		bandId: row.bandId,
		key,
		from: 'DECLARED',
		to: 'CORROBORATED',
		occurredAt: row.occurredAt,
		formedAt,
		now
	});
}

/** Étape déclarée, de la gestion, qui se prouve encore (sinon refus). */
async function provableMilestone(tx: Tx, milestoneId: string, managerId: string) {
	const row = await milestoneHead(tx, milestoneId);
	await lockBand(tx, row.bandId);
	const band = await managedBand(tx, row.bandId, managerId);
	if (band.dissolvedAt) throw new MilestoneError('Ce groupe est dissous.');
	const rule = proofRule(row.key);
	if (!rule) throw new MilestoneError('Cette étape ne se prouve pas ainsi.');
	if (row.proof !== 'DECLARED') throw new MilestoneError('Cette étape est déjà corroborée.');
	return { row, rule, formedAt: band.formedAt! };
}

/** Demander à une personne (par son @identifiant) de confirmer l'étape. */
export async function requestAttestation(
	milestoneId: string,
	managerId: string,
	rawHandle: string,
	now = new Date()
) {
	const handle = rawHandle.trim().replace(/^@/, '').toLowerCase();
	return prisma.$transaction(async (tx) => {
		const { row, rule, formedAt } = await provableMilestone(tx, milestoneId, managerId);
		if (!rule.attester) {
			throw new MilestoneError('Cette étape se prouve par un lien, pas par une personne.');
		}
		const person = await tx.actor.findFirst({
			where: { handle, kind: 'PERSON', ...publicActorWhere(now, managerId) },
			select: {
				id: true,
				displayName: true,
				trustLevel: true,
				person: { select: { birthDate: true } }
			}
		});
		if (!person) throw new MilestoneError('Personne introuvable avec cet identifiant.', 404);
		const already = await tx.milestoneAttestation.findUnique({
			where: { milestoneId_attesterId: { milestoneId, attesterId: person.id } },
			select: { id: true }
		});
		if (already) throw new MilestoneError(`Tu as déjà demandé à ${person.displayName}.`);
		const pending = await tx.milestoneAttestation.count({
			where: { milestoneId, status: 'REQUESTED' }
		});
		if (pending >= MAX_PENDING_ATTESTATIONS) {
			throw new MilestoneError(
				`${MAX_PENDING_ATTESTATIONS} demandes attendent déjà une réponse pour cette étape.`
			);
		}
		const periods = await bandPeriods(tx, row.bandId);
		const adult = isIndexable(person.person?.birthDate, now);
		const blocker = attesterBlocker({
			role: rule.attester,
			self: person.id === managerId,
			declaredByThem: person.id === row.declaredById,
			everMember: periods.some((p) => p.personId === person.id),
			presentAtDate: membersAt(periods, creditDate(row.occurredAt, formedAt)).includes(person.id),
			trustLevel: person.trustLevel,
			blocked: await isBlockedBetween(managerId, person.id),
			minorUnknown: !adult && !(await canInviteMinor(managerId, person.id))
		});
		if (blocker) throw new MilestoneError(blocker);
		await tx.milestoneAttestation.create({
			data: { milestoneId, attesterId: person.id, requestedById: managerId, role: rule.attester }
		});
		await notify(tx, {
			recipientId: person.id,
			type: 'MILESTONE_ATTEST',
			fromActorId: managerId,
			href: `/etapes/${milestoneId}`,
			title: `${milestoneDef(row.key).label} de ${row.band.displayName}`
		});
		return { displayName: person.displayName };
	}, TX);
}

/**
 * Répondre à une demande : « Je confirme » ou « Je n’y étais pas ». Une
 * confirmation peut corroborer l'étape.
 */
export async function answerAttestation(
	milestoneId: string,
	personId: string,
	confirm: boolean,
	now = new Date()
) {
	return prisma.$transaction(async (tx) => {
		const head = await milestoneHead(tx, milestoneId);
		await lockBand(tx, head.bandId);
		const asked = await tx.milestoneAttestation.findUnique({
			where: { milestoneId_attesterId: { milestoneId, attesterId: personId } },
			select: { id: true, role: true, status: true, requestedById: true }
		});
		if (!asked || asked.status !== 'REQUESTED') {
			throw new MilestoneError('Rien à confirmer pour cette étape.', 404);
		}
		if (!confirm) {
			await tx.milestoneAttestation.update({
				where: { id: asked.id },
				data: { status: 'DECLINED', answeredAt: now }
			});
			return { corroborated: false };
		}
		// Les conditions se revérifient au moment de confirmer.
		if (asked.role === 'OUTSIDER') {
			const [me, member] = await Promise.all([
				tx.actor.findUnique({ where: { id: personId }, select: { trustLevel: true } }),
				tx.membership.count({
					where: {
						orgId: head.bandId,
						personId,
						status: { in: ['ACTIVE', 'LEFT', 'REMOVED'] }
					}
				})
			]);
			if (member > 0)
				throw new MilestoneError('Tu fais partie du groupe : demande à un autre membre.');
			if ((me?.trustLevel ?? 0) < MIN_OUTSIDER_TRUST) {
				throw new MilestoneError(
					'Ton compte vient d’arriver : tu pourras confirmer dans quelques jours.'
				);
			}
		}
		await tx.milestoneAttestation.update({
			where: { id: asked.id },
			data: { status: 'CONFIRMED', answeredAt: now }
		});
		await emitAndProcess(tx, {
			type: 'milestone.attestation_confirmed',
			bandId: head.bandId,
			milestoneId,
			attesterId: personId,
			requesterId: asked.requestedById,
			occurredAt: now
		});
		const result = await evaluate(tx, milestoneId, now);
		return { corroborated: result !== null };
	}, TX);
}

/** Joindre un lien à l'étape (un lien d'écoute attend la modération). */
export async function addEvidence(
	milestoneId: string,
	managerId: string,
	rawUrl: string,
	now = new Date()
) {
	const candidate = await prisma.$transaction(async (tx) => {
		const { row, rule } = await provableMilestone(tx, milestoneId, managerId);
		if (!rule.evidence) throw new MilestoneError('Cette étape se prouve par une personne.');
		const evidenceRule = rule.evidence;
		const checked = checkEvidenceUrl(evidenceRule.kind, rawUrl);
		if (!checked.ok) throw new MilestoneError(checked.error);
		const count = await tx.milestoneEvidence.count({
			where: { milestoneId, status: { not: 'REJECTED' } }
		});
		if (count >= MAX_EVIDENCE) {
			throw new MilestoneError(`${MAX_EVIDENCE} liens au plus par étape.`);
		}
		return {
			bandId: row.bandId,
			key: row.key,
			kind: evidenceRule.kind,
			artistName: row.band.displayName,
			url: checked.url
		};
	}, TX);

	const verification =
		candidate.key === 'FIRST_PUBLIC_DEMO'
			? await verifyMusicBrainzDemo({ url: candidate.url, artistName: candidate.artistName })
			: null;

	return prisma.$transaction(async (tx) => {
		const { row, rule, formedAt } = await provableMilestone(tx, milestoneId, managerId);
		if (row.bandId !== candidate.bandId || row.key !== candidate.key) {
			throw new MilestoneError('Cette étape a changé, recharge la page.');
		}
		const count = await tx.milestoneEvidence.count({
			where: { milestoneId, status: { not: 'REJECTED' } }
		});
		if (count >= MAX_EVIDENCE) {
			throw new MilestoneError(`${MAX_EVIDENCE} liens au plus par étape.`);
		}
		if (!rule.evidence) throw new MilestoneError('Cette étape ne se prouve plus par un lien.');
		const evidenceRule = rule.evidence;
		const verified = verification?.status === 'verified';
		const status = verified ? 'VERIFIED' : evidenceRule.reviewed ? 'PENDING' : 'ACCEPTED';
		await tx.milestoneEvidence.create({
			data: {
				milestoneId,
				kind: candidate.kind,
				url: candidate.url,
				addedById: managerId,
				status
			}
		});
		let corroborated = false;
		if (verified) {
			await tx.milestone.update({ where: { id: milestoneId }, data: { proof: 'VERIFIED' } });
			await attest(tx, {
				bandId: row.bandId,
				key: row.key,
				from: 'DECLARED',
				to: 'VERIFIED',
				occurredAt: row.occurredAt,
				formedAt,
				now
			});
			corroborated = true;
		} else if (status === 'ACCEPTED') {
			corroborated = (await evaluate(tx, milestoneId, now)) !== null;
		}
		return {
			reviewed: status === 'PENDING',
			corroborated,
			verified,
			title: verification?.status === 'verified' ? verification.title : null
		};
	}, TX);
}

// ─── Modération ──────────────────────────────────────────────────────────

/** Liens d'écoute en attente (« le nom d'artiste correspond-il ? »). */
export async function pendingEvidence() {
	const rows = await prisma.milestoneEvidence.findMany({
		where: { status: 'PENDING' },
		orderBy: { createdAt: 'asc' },
		take: 50,
		select: {
			id: true,
			url: true,
			createdAt: true,
			milestone: {
				select: { definitionId: true, band: { select: { handle: true, displayName: true } } }
			}
		}
	});
	return rows.map((r) => ({
		id: r.id,
		url: r.url,
		createdAt: r.createdAt,
		label: milestoneDef(r.milestone.definitionId as MilestoneKey).label,
		band: r.milestone.band
	}));
}

export async function reviewEvidence(
	evidenceId: string,
	accept: boolean,
	by: { userId: string },
	reason = '',
	now = new Date()
) {
	await prisma.$transaction(async (tx) => {
		const row = await tx.milestoneEvidence.findUnique({
			where: { id: evidenceId },
			select: { status: true, milestone: { select: { id: true, bandId: true } } }
		});
		if (!row || row.status !== 'PENDING') {
			throw new MilestoneError('Ce lien n’est plus en attente.', 404);
		}
		await lockBand(tx, row.milestone.bandId);
		await tx.milestoneEvidence.update({
			where: { id: evidenceId },
			data: {
				status: accept ? 'ACCEPTED' : 'REJECTED',
				reviewedAt: now,
				reviewedByUserId: by.userId,
				rejectionReason: accept ? null : reason || 'Refusé par la modération.'
			}
		});
		if (accept) await evaluate(tx, row.milestone.id, now);
	}, TX);
	await logAdminAction({
		actorId: by.userId,
		action: accept
			? 'moderation.milestone_evidence.accept'
			: 'moderation.milestone_evidence.reject',
		targetType: 'MilestoneEvidence',
		targetId: evidenceId,
		metadata: accept ? undefined : { reason }
	});
}

// ─── Lectures ────────────────────────────────────────────────────────────

/**
 * Preuves de chaque étape du groupe, pour sa gestion : demandes et
 * réponses, liens, et ce qu'il reste à faire.
 */
export async function bandMilestoneProofs(bandId: string) {
	const rows = await prisma.milestone.findMany({
		where: { bandId },
		select: {
			id: true,
			definitionId: true,
			attestations: {
				orderBy: { createdAt: 'asc' },
				select: {
					role: true,
					status: true,
					attester: { select: { displayName: true, handle: true, deletedAt: true } }
				}
			},
			evidence: {
				orderBy: { createdAt: 'asc' },
				select: { id: true, kind: true, url: true, status: true, rejectionReason: true }
			}
		}
	});
	return Object.fromEntries(
		rows.map((r) => [
			r.id,
			{
				checklist: proofChecklist(r.definitionId as MilestoneKey, r),
				attestations: r.attestations.map((a) => ({
					name: a.attester.deletedAt ? 'Compte supprimé' : a.attester.displayName,
					role: a.role,
					status: a.status
				})),
				evidence: r.evidence
			}
		])
	);
}
export type MilestoneProofs = Awaited<ReturnType<typeof bandMilestoneProofs>>[string];

/** La demande vue par la personne sollicitée (`/etapes/[id]`), ou `null`. */
export async function attestationPage(milestoneId: string, viewerId: string) {
	const asked = await prisma.milestoneAttestation.findUnique({
		where: { milestoneId_attesterId: { milestoneId, attesterId: viewerId } },
		select: {
			role: true,
			status: true,
			requestedBy: { select: { displayName: true } },
			milestone: {
				select: {
					definitionId: true,
					proof: true,
					occurredAt: true,
					note: true,
					band: { select: { handle: true, displayName: true, deletedAt: true } },
					evidence: { where: { status: 'ACCEPTED' }, select: { kind: true, url: true } }
				}
			}
		}
	});
	if (!asked || asked.milestone.band.deletedAt) return null;
	const m = asked.milestone;
	return {
		label: milestoneDef(m.definitionId as MilestoneKey).label,
		occurredAt: m.occurredAt,
		note: m.note,
		proof: m.proof,
		band: { handle: m.band.handle, name: m.band.displayName },
		requestedBy: asked.requestedBy?.displayName ?? null,
		role: asked.role,
		status: asked.status,
		evidence: m.evidence
	};
}

/** Export RGPD : confirmations demandées à la personne, et liens joints. */
export async function proofsExport(personId: string) {
	const [asked, added] = await Promise.all([
		prisma.milestoneAttestation.findMany({
			where: { attesterId: personId },
			orderBy: { createdAt: 'asc' },
			select: {
				status: true,
				createdAt: true,
				answeredAt: true,
				milestone: { select: { definitionId: true, band: { select: { displayName: true } } } }
			}
		}),
		prisma.milestoneEvidence.findMany({
			where: { addedById: personId },
			orderBy: { createdAt: 'asc' },
			select: {
				url: true,
				status: true,
				createdAt: true,
				milestone: { select: { definitionId: true, band: { select: { displayName: true } } } }
			}
		})
	]);
	const label = (id: string) => milestoneDef(id as MilestoneKey).label;
	return {
		confirmations: asked.map((a) => ({
			groupe: a.milestone.band.displayName,
			etape: label(a.milestone.definitionId),
			statut: a.status,
			demandee_le: a.createdAt,
			repondu_le: a.answeredAt
		})),
		liens: added.map((e) => ({
			groupe: e.milestone.band.displayName,
			etape: label(e.milestone.definitionId),
			lien: e.url,
			statut: e.status,
			ajoute_le: e.createdAt
		}))
	};
}
