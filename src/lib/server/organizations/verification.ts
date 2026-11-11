/**
 * Vérification des organisations (P3-09, P5-02, conception 02 §4), seul
 * point d'écriture de `OrganizationVerification` et
 * `Organization.verifiedAt`. Règles pures : `#lib/organizations/verification`.
 *
 * - La gestion d'une organisation (groupe, studio ; lieux et labels ensuite)
 *   demande (SIRET, lien officiel) ;
 * - le SIRET est cherché dans la base Sirene (`establishments.ts`) : inconnu
 *   ou fermé, la demande est refusée tout de suite ; sinon le nom et le code
 *   NAF trouvés sont joints pour la modération ;
 * - la modération accorde (`verifiedAt`), refuse avec un motif, ou retire
 *   une vérification accordée ; chaque décision est au journal d'audit ;
 * - un SIRET n'est accordé qu'à une organisation.
 *
 * Aucune XP, aucune confiance : un statut accordé. Il donne des droits
 * (`isVerifiedOrg`) : faire passer un concert `VERIFIED` (P5-06).
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { logAdminAction } from '#lib/server/audit-log';
import { lookupEstablishment, SiretLookupError } from '#lib/server/venues/establishments';
import { isManager } from '#lib/bands/rules';
import {
	establishmentBlocker,
	MAX_REASON,
	requestBlocker,
	verificationSchema,
	type VerificationInput
} from '#lib/organizations/verification';

export class VerificationError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

type Moderator = { userId: string };
const DAY = 86_400_000;

/**
 * L'organisation est-elle vérifiée ? Seul droit lié au statut : une
 * organisation vérifiée fait passer une étape au niveau `VERIFIED` (P5-06).
 */
export async function isVerifiedOrg(
	orgId: string,
	db: Prisma.TransactionClient = prisma
): Promise<boolean> {
	const org = await db.organization.findFirst({
		where: { actorId: orgId, verifiedAt: { not: null }, actor: { deletedAt: null } },
		select: { actorId: true }
	});
	return org !== null;
}

/** État de la vérification d'une organisation, pour sa gestion. */
export async function verificationState(orgId: string) {
	const [org, last] = await Promise.all([
		prisma.organization.findUnique({ where: { actorId: orgId }, select: { verifiedAt: true } }),
		prisma.organizationVerification.findFirst({
			where: { orgId },
			orderBy: { createdAt: 'desc' },
			select: { status: true, reason: true, createdAt: true, officialUrl: true }
		})
	]);
	return {
		verifiedAt: org?.verifiedAt ?? null,
		last: last
			? {
					status: last.status,
					reason: last.reason,
					createdAt: last.createdAt,
					officialUrl: last.officialUrl
				}
			: null
	};
}

/** La gestion du groupe demande la vérification. */
export async function requestVerification(
	orgId: string,
	personId: string,
	raw: { siret: string; officialUrl: string },
	now = new Date()
) {
	const parsed = verificationSchema.safeParse(raw);
	if (!parsed.success) {
		throw new VerificationError(parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.');
	}
	const input: VerificationInput = parsed.data;
	const [org, mine, pending, recent, taken] = await Promise.all([
		prisma.organization.findFirst({
			where: { actorId: orgId, actor: { deletedAt: null } },
			select: { verifiedAt: true, dissolvedAt: true }
		}),
		prisma.membership.findFirst({
			where: { orgId, personId, status: 'ACTIVE' },
			select: { role: true }
		}),
		prisma.organizationVerification.count({ where: { orgId, status: 'PENDING' } }),
		prisma.organizationVerification.count({
			where: { orgId, createdAt: { gte: new Date(now.getTime() - 30 * DAY) } }
		}),
		prisma.organizationVerification.count({
			where: { siret: input.siret, status: 'APPROVED', orgId: { not: orgId } }
		})
	]);
	if (!org) throw new VerificationError('Cette organisation n’existe plus.', 404);
	const blocker = requestBlocker({
		isManager: isManager(mine?.role),
		verified: org.verifiedAt !== null,
		dissolved: org.dissolvedAt !== null,
		pending: pending > 0,
		recentRequests: recent
	});
	if (blocker) throw new VerificationError(blocker, mine ? 400 : 403);
	if (taken > 0) throw new VerificationError('Ce SIRET est déjà celui d’une autre organisation.');
	// Contrôle automatique (P5-02) : un SIRET inconnu ou fermé ne va pas en file.
	let found: Awaited<ReturnType<typeof lookupEstablishment>>;
	try {
		found = await lookupEstablishment(input.siret, personId);
	} catch (err) {
		if (err instanceof SiretLookupError) throw new VerificationError(err.message, 503);
		throw err;
	}
	const closed = establishmentBlocker(found);
	if (closed) throw new VerificationError(closed);
	await prisma.organizationVerification.create({
		data: {
			orgId,
			requestedById: personId,
			siret: input.siret,
			officialUrl: input.officialUrl,
			foundName: found?.name ?? null,
			naf: found?.naf ?? null
		}
	});
}

/** File de la modération : demandes en attente, les plus anciennes d'abord. */
export async function pendingVerifications() {
	const rows = await prisma.organizationVerification.findMany({
		where: { status: 'PENDING' },
		orderBy: { createdAt: 'asc' },
		take: 50,
		select: {
			id: true,
			siret: true,
			officialUrl: true,
			foundName: true,
			naf: true,
			createdAt: true,
			requestedBy: { select: { handle: true, displayName: true } },
			org: {
				select: {
					kind: true,
					actor: { select: { handle: true, displayName: true } },
					_count: { select: { memberships: { where: { status: 'ACTIVE' } } } }
				}
			}
		}
	});
	return rows.map((r) => ({
		id: r.id,
		siret: r.siret,
		officialUrl: r.officialUrl,
		foundName: r.foundName,
		naf: r.naf,
		createdAt: r.createdAt,
		requestedBy: r.requestedBy,
		kind: r.org.kind,
		org: r.org.actor,
		members: r.org._count.memberships
	}));
}

async function pendingRequest(id: string) {
	const row = await prisma.organizationVerification.findUnique({
		where: { id },
		select: { orgId: true, siret: true, status: true }
	});
	if (!row || row.status !== 'PENDING') {
		throw new VerificationError('Cette demande n’est plus en attente.', 404);
	}
	return row;
}

/** Accorder : l'organisation devient vérifiée. */
export async function approveVerification(id: string, by: Moderator, now = new Date()) {
	const row = await pendingRequest(id);
	const taken = await prisma.organizationVerification.count({
		where: { siret: row.siret, status: 'APPROVED', orgId: { not: row.orgId } }
	});
	if (taken > 0) throw new VerificationError('Ce SIRET est déjà celui d’une autre organisation.');
	await prisma.$transaction([
		prisma.organizationVerification.update({
			where: { id },
			data: { status: 'APPROVED', reviewedAt: now, reviewedByUserId: by.userId }
		}),
		prisma.organization.update({ where: { actorId: row.orgId }, data: { verifiedAt: now } })
	]);
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.organization.approve',
		targetType: 'Organization',
		targetId: row.orgId,
		metadata: { requestId: id, siret: row.siret }
	});
}

/** Refuser, avec un motif montré à la gestion du groupe. */
export async function rejectVerification(
	id: string,
	reason: string,
	by: Moderator,
	now = new Date()
) {
	const motive = reason.trim();
	if (!motive) throw new VerificationError('Indique le motif du refus.');
	const row = await pendingRequest(id);
	await prisma.organizationVerification.update({
		where: { id },
		data: {
			status: 'REJECTED',
			reviewedAt: now,
			reviewedByUserId: by.userId,
			reason: motive.slice(0, MAX_REASON)
		}
	});
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.organization.reject',
		targetType: 'Organization',
		targetId: row.orgId,
		metadata: { requestId: id, reason: motive }
	});
}

/** Organisations vérifiées, les plus récentes d'abord : la modération peut retirer. */
export async function verifiedOrganizations() {
	const rows = await prisma.organization.findMany({
		where: { verifiedAt: { not: null }, actor: { deletedAt: null } },
		orderBy: { verifiedAt: 'desc' },
		take: 50,
		select: {
			actorId: true,
			kind: true,
			verifiedAt: true,
			actor: { select: { handle: true, displayName: true } },
			verifications: {
				where: { status: 'APPROVED' },
				orderBy: { reviewedAt: 'desc' },
				take: 1,
				select: { siret: true }
			}
		}
	});
	return rows.map((r) => ({
		orgId: r.actorId,
		kind: r.kind,
		verifiedAt: r.verifiedAt!,
		org: r.actor,
		siret: r.verifications[0]?.siret ?? null
	}));
}

/**
 * Retirer la vérification (P5-02) : SIRET radié, lien officiel perdu, abus.
 * `verifiedAt` repasse à `null` et la demande accordée passe `REVOKED`, avec
 * le motif montré à la gestion ; le SIRET redevient libre. Les étapes déjà
 * vérifiées **restent** (Q22) : seules les suivantes changent.
 */
export async function revokeVerification(
	orgId: string,
	by: Moderator,
	reason: string,
	now = new Date()
) {
	const motive = reason.trim();
	if (!motive) throw new VerificationError('Indique le motif du retrait.');
	const org = await prisma.organization.findUnique({
		where: { actorId: orgId },
		select: { verifiedAt: true }
	});
	if (!org?.verifiedAt) throw new VerificationError('Cette organisation n’est pas vérifiée.', 404);
	const approved = await prisma.organizationVerification.findFirst({
		where: { orgId, status: 'APPROVED' },
		orderBy: { reviewedAt: 'desc' },
		select: { id: true, siret: true }
	});
	await prisma.$transaction([
		...(approved
			? [
					prisma.organizationVerification.update({
						where: { id: approved.id },
						data: { status: 'REVOKED', revokedAt: now, reason: motive.slice(0, MAX_REASON) }
					})
				]
			: []),
		prisma.organization.update({ where: { actorId: orgId }, data: { verifiedAt: null } })
	]);
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.organization.revoke',
		targetType: 'Organization',
		targetId: orgId,
		metadata: { requestId: approved?.id ?? null, siret: approved?.siret ?? null, reason: motive }
	});
}

/** Export RGPD : demandes faites par la personne. */
export async function verificationsExport(personId: string) {
	const rows = await prisma.organizationVerification.findMany({
		where: { requestedById: personId },
		orderBy: { createdAt: 'asc' },
		select: {
			siret: true,
			officialUrl: true,
			status: true,
			createdAt: true,
			org: { select: { actor: { select: { displayName: true } } } }
		}
	});
	return rows.map((r) => ({
		organisation: r.org.actor.displayName,
		siret: r.siret,
		lien_officiel: r.officialUrl,
		statut: r.status,
		le: r.createdAt
	}));
}
