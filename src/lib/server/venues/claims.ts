/**
 * Revendication de la fiche d'un lieu, niveau 1 (P5-03a, D31), seul point
 * d'écriture de `VenueClaim` et de `Venue.claimedByActorId`. Règles pures :
 * `#lib/venues/claim`.
 *
 * 1. La personne (majeure) demande : un code lui est donné.
 * 2. Elle le publie (bio Instagram ou Facebook du lieu, page du site) et
 *    colle le lien : la demande passe en file de modération.
 * 3. La modération approuve : l'organisation `VENUE` est créée, gérée par la
 *    personne (OWNER), et la fiche pointe sur elle (« Géré par le lieu »).
 *    Les autres demandes ouvertes sur ce lieu sont refusées. Ou elle refuse,
 *    avec un motif montré à la personne.
 *
 * L'organisation naît à l'approbation, pas à la demande (défaut Q28) : une
 * demande refusée ne laisse pas d'organisation vide. Aucune XP.
 */
import { prisma } from '#lib/server';
import { logAdminAction } from '#lib/server/audit-log';
import { notify } from '#lib/server/notifications/service';
import { suggestHandle } from '#lib/actors/handle';
import { adultBirthCutoff } from '#lib/actors/visibility';
import { isManager } from '#lib/bands/rules';
import { annuaireUrl } from '#lib/organizations/verification';
import {
	claimBlocker,
	claimCode,
	displayedCode,
	MAX_CLAIM_REASON,
	proofUrlSchema
} from '#lib/venues/claim';

export class ClaimError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

type Moderator = { userId: string };
const DAY = 86_400_000;
const TX = { timeout: 20_000 } as const;
const OPEN = ['AWAITING_PROOF', 'PENDING'] as const;
const liveVenueOrg = { kind: 'VENUE', dissolvedAt: null, actor: { deletedAt: null } } as const;

/** Tirage cryptographique pour le code (le module pur accepte n'importe quelle source). */
const secureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

/** Lieux que la personne gère (organisations VENUE actives). */
function managedVenues(personId: string) {
	return prisma.membership.count({
		where: { personId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, org: liveVenueOrg }
	});
}

/** La personne gère-t-elle l'organisation qui a revendiqué ce lieu ? */
export async function managesVenueOrg(orgId: string, personId: string) {
	const mine = await prisma.membership.findFirst({
		where: { orgId, personId, status: 'ACTIVE', org: liveVenueOrg },
		select: { role: true }
	});
	return isManager(mine?.role);
}

async function blockerFor(venueId: string, personId: string, now: Date) {
	const [venue, person, recent, managed] = await Promise.all([
		prisma.venue.findFirst({
			where: { id: venueId, removedAt: null },
			select: { validatedAt: true, claimedByActorId: true }
		}),
		prisma.person.findUnique({ where: { actorId: personId }, select: { birthDate: true } }),
		prisma.venueClaim.count({
			where: { requestedById: personId, createdAt: { gte: new Date(now.getTime() - 30 * DAY) } }
		}),
		managedVenues(personId)
	]);
	if (!venue) throw new ClaimError('Lieu introuvable.', 404);
	return claimBlocker({
		adult: Boolean(person?.birthDate && person.birthDate <= adultBirthCutoff(now)),
		validated: venue.validatedAt !== null,
		claimed: venue.claimedByActorId !== null,
		recentClaims: recent,
		managedVenues: managed
	});
}

/** Ce que la fiche du lieu montre de la revendication, pour cette personne. */
export async function claimState(venueId: string, personId: string, now = new Date()) {
	const [venue, mine] = await Promise.all([
		prisma.venue.findUnique({
			where: { id: venueId },
			select: {
				claimedBy: {
					select: { handle: true, displayName: true, organization: { select: { kind: true } } }
				}
			}
		}),
		prisma.venueClaim.findFirst({
			where: { venueId, requestedById: personId },
			orderBy: { createdAt: 'desc' },
			select: { status: true, code: true, proofUrl: true, reason: true }
		})
	]);
	const claimedBy = venue?.claimedBy ?? null;
	const open = mine && (OPEN as readonly string[]).includes(mine.status);
	return {
		claimed: claimedBy !== null,
		mine: mine
			? {
					status: mine.status,
					code: open ? displayedCode(mine.code) : null,
					proofUrl: mine.proofUrl,
					reason: mine.reason
				}
			: null,
		/** Refus possible avant même de demander (affiché à la place du bouton). */
		blocker: claimedBy || open ? null : await blockerFor(venueId, personId, now)
	};
}

/** « C'est mon lieu » : donne un code (le même tant que la demande est ouverte). */
export async function startClaim(venueId: string, personId: string, now = new Date()) {
	const open = await prisma.venueClaim.findFirst({
		where: { venueId, requestedById: personId, status: { in: [...OPEN] } },
		select: { code: true }
	});
	if (open) return displayedCode(open.code);
	const blocker = await blockerFor(venueId, personId, now);
	if (blocker) throw new ClaimError(blocker);
	const claim = await prisma.venueClaim.create({
		data: { venueId, requestedById: personId, code: claimCode(secureRandom) },
		select: { code: true }
	});
	return displayedCode(claim.code);
}

/** Lien de la page où le code est publié : la demande part en modération. */
export async function submitClaimProof(
	venueId: string,
	personId: string,
	rawUrl: string,
	now = new Date()
) {
	const parsed = proofUrlSchema.safeParse(rawUrl);
	if (!parsed.success) {
		throw new ClaimError(parsed.error.issues[0]?.message ?? 'Lien invalide.');
	}
	const updated = await prisma.venueClaim.updateMany({
		where: { venueId, requestedById: personId, status: { in: [...OPEN] } },
		data: { proofUrl: parsed.data, status: 'PENDING', submittedAt: now }
	});
	if (updated.count === 0) {
		throw new ClaimError('Commence par « C’est mon lieu » pour obtenir un code.', 404);
	}
}

/** File de la modération : demandes avec un lien, les plus anciennes d'abord. */
export async function pendingVenueClaims() {
	const rows = await prisma.venueClaim.findMany({
		where: { status: 'PENDING' },
		orderBy: { submittedAt: 'asc' },
		take: 50,
		select: {
			id: true,
			code: true,
			proofUrl: true,
			submittedAt: true,
			requestedBy: { select: { handle: true, displayName: true, createdAt: true } },
			venue: {
				select: {
					id: true,
					name: true,
					communeName: true,
					siret: true,
					verifiedAt: true
				}
			}
		}
	});
	return rows.map((r) => ({
		id: r.id,
		code: displayedCode(r.code),
		proofUrl: r.proofUrl,
		submittedAt: r.submittedAt,
		requestedBy: r.requestedBy,
		venue: {
			id: r.venue.id,
			name: r.venue.name,
			communeName: r.venue.communeName,
			annuaire: r.venue.siret && r.venue.verifiedAt ? annuaireUrl(r.venue.siret) : null
		}
	}));
}

async function pendingClaim(id: string) {
	const row = await prisma.venueClaim.findUnique({
		where: { id },
		select: {
			status: true,
			venueId: true,
			requestedById: true,
			venue: { select: { name: true, claimedByActorId: true, removedAt: true } }
		}
	});
	if (!row || row.status !== 'PENDING') {
		throw new ClaimError('Cette demande n’est plus en attente.', 404);
	}
	return row;
}

/**
 * Approuver : l'organisation VENUE naît, gérée par la personne, et la fiche
 * pointe sur elle. Une seule organisation par lieu, garanti par la mise à
 * jour conditionnelle de la fiche.
 */
export async function approveVenueClaim(id: string, by: Moderator, now = new Date()) {
	const row = await pendingClaim(id);
	if (!row.requestedById) throw new ClaimError('Le compte qui a demandé n’existe plus.');
	if (row.venue.removedAt) throw new ClaimError('Ce lieu a été retiré de l’annuaire.');
	if (row.venue.claimedByActorId) throw new ClaimError('Ce lieu est déjà géré sur LinkMusician.');
	const personId = row.requestedById;
	const handle = await suggestHandle(row.venue.name, async (candidate) =>
		Boolean(await prisma.actor.findUnique({ where: { handle: candidate }, select: { id: true } }))
	);
	const orgId = await prisma.$transaction(async (tx) => {
		const actor = await tx.actor.create({
			data: {
				kind: 'ORGANIZATION',
				handle,
				displayName: row.venue.name,
				organization: { create: { kind: 'VENUE' } }
			},
			select: { id: true }
		});
		await tx.membership.create({
			data: { orgId: actor.id, personId, role: 'OWNER', status: 'ACTIVE', startedAt: now }
		});
		const claimed = await tx.venue.updateMany({
			where: { id: row.venueId, claimedByActorId: null, removedAt: null },
			data: { claimedByActorId: actor.id }
		});
		if (claimed.count === 0) throw new ClaimError('Ce lieu est déjà géré sur LinkMusician.');
		await tx.venueClaim.update({
			where: { id },
			data: { status: 'APPROVED', orgId: actor.id, reviewedAt: now, reviewedByUserId: by.userId }
		});
		// Décision annoncée (P5-03b, Q29) : la fiche du lieu dit la suite.
		await notify(tx, {
			recipientId: personId,
			type: 'VENUE_CLAIM',
			href: `/lieux/${row.venueId}`,
			title: row.venue.name
		});
		await tx.venueClaim.updateMany({
			where: { venueId: row.venueId, id: { not: id }, status: { in: [...OPEN] } },
			data: {
				status: 'REJECTED',
				reviewedAt: now,
				reviewedByUserId: by.userId,
				reason: 'Le lieu a été revendiqué par une autre personne.'
			}
		});
		return actor.id;
	}, TX);
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.venue_claim.approve',
		targetType: 'Venue',
		targetId: row.venueId,
		metadata: { claimId: id, orgId }
	});
	return orgId;
}

/** Refuser, avec un motif montré à la personne. */
export async function rejectVenueClaim(
	id: string,
	reason: string,
	by: Moderator,
	now = new Date()
) {
	const motive = reason.trim();
	if (!motive) throw new ClaimError('Indique le motif du refus.');
	const row = await pendingClaim(id);
	await prisma.$transaction(async (tx) => {
		await tx.venueClaim.update({
			where: { id },
			data: {
				status: 'REJECTED',
				reviewedAt: now,
				reviewedByUserId: by.userId,
				reason: motive.slice(0, MAX_CLAIM_REASON)
			}
		});
		// Décision annoncée (P5-03b, Q29) : le motif se lit sur la fiche.
		if (row.requestedById) {
			await notify(tx, {
				recipientId: row.requestedById,
				type: 'VENUE_CLAIM',
				href: `/lieux/${row.venueId}`,
				title: row.venue.name
			});
		}
	});
	await logAdminAction({
		actorId: by.userId,
		action: 'moderation.venue_claim.reject',
		targetType: 'Venue',
		targetId: row.venueId,
		metadata: { claimId: id, reason: motive }
	});
}

/** Export RGPD : revendications faites par la personne. */
export async function venueClaimsExport(personId: string) {
	const rows = await prisma.venueClaim.findMany({
		where: { requestedById: personId },
		orderBy: { createdAt: 'asc' },
		select: {
			code: true,
			proofUrl: true,
			status: true,
			reason: true,
			createdAt: true,
			venue: { select: { name: true } }
		}
	});
	return rows.map((r) => ({
		lieu: r.venue.name,
		code: displayedCode(r.code),
		lien_de_preuve: r.proofUrl,
		statut: r.status,
		motif: r.reason,
		le: r.createdAt
	}));
}
