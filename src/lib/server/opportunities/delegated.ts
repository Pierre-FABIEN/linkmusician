/** D71 : candidater pour un artiste, seulement par un droit explicite relu sous verrou. */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { qualifiedTable } from '#lib/server/db-schema';
import { getActorLocation } from '#lib/server/geo/queries';
import { notify } from '#lib/server/notifications/service';
import { artistAnswerers } from '#lib/server/representation/delegationAccess';
import { lockGrantPair, usableGrant } from '#lib/server/representation/applicationGrants';
import { isActive } from '#lib/opportunities/rules';
import { checkedMessage, eligibilityFor } from './applications';
import { checkBand } from './gigSlots';
import { OpportunityError } from './service';

type Db = Prisma.TransactionClient | typeof prisma;
type Opportunity = Prisma.OpportunityGetPayload<object>;

async function conditions(db: Db, agentId: string, artistId: string, o: Opportunity, now: Date) {
	if (!['JAM', 'SESSION_WORK', 'GIG_SLOT'].includes(o.kind))
		throw new OpportunityError('Ce type d’annonce ne permet pas la candidature déléguée.', 403);
	const grantId = await usableGrant(db, agentId, artistId, o.kind, now);
	if (!grantId)
		throw new OpportunityError('Aucun droit actif de candidater pour cet artiste.', 403);
	const grant = await db.applicationGrant.findUniqueOrThrow({
		where: { id: grantId },
		select: { representation: { select: { departmentCodes: true } } }
	});
	const departments = grant.representation.departmentCodes;
	if (departments.length) {
		const location = await getActorLocation(o.issuerActorId, { db });
		if (!location || !departments.includes(location.departmentCode))
			throw new OpportunityError('Cette annonce est hors du territoire du mandat.', 403);
	}
	for (const viewerId of [agentId, artistId]) {
		if (
			viewerId === o.issuerActorId ||
			(await db.membership.count({
				where: { orgId: o.issuerActorId, personId: viewerId, status: 'ACTIVE' }
			}))
		)
			throw new OpportunityError(
				'On ne candidate pas à sa propre annonce ou à celle de son groupe.'
			);
		if (
			!(await db.actor.count({
				where: { id: o.issuerActorId, ...publicActorWhere(now, viewerId) }
			}))
		)
			throw new OpportunityError('Annonce introuvable.', 404);
	}
	// Le profil candidat doit lui aussi être disponible pour l’émetteur.
	if (
		!(await db.actor.count({ where: { id: artistId, ...publicActorWhere(now, o.issuerActorId) } }))
	)
		throw new OpportunityError('Cet artiste ne peut pas candidater.', 403);
	const eligibility =
		o.kind === 'GIG_SLOT'
			? await checkBand(o, artistId, db)
			: await eligibilityFor(artistId, o, db);
	return { grantId, ...eligibility };
}

export async function applyDelegated(
	agentId: string,
	opportunityId: string,
	artistId: string,
	raw: string
) {
	const initial = await prisma.opportunity.findUnique({
		where: { id: opportunityId },
		select: { kind: true, issuerActorId: true }
	});
	if (!initial) throw new OpportunityError('Annonce introuvable.', 404);
	if (initial.kind === 'RECRUIT_MEMBER')
		throw new OpportunityError('Le recrutement exige une candidature personnelle.', 403);
	if ([agentId, artistId].includes(initial.issuerActorId))
		throw new OpportunityError('On ne candidate pas à sa propre annonce.');
	const message = checkedMessage(raw);
	return prisma.$transaction(
		async (tx) => {
			await lockGrantPair(tx, agentId, artistId);
			await tx.$queryRaw`SELECT id FROM ${qualifiedTable('opportunities')} WHERE id = ${opportunityId} FOR UPDATE`;
			// L’instant est pris après l’attente : une échéance passée pendant celle-ci compte.
			const now = new Date();
			const o = await tx.opportunity.findUnique({ where: { id: opportunityId } });
			if (!o || o.status === 'REMOVED') throw new OpportunityError('Annonce introuvable.', 404);
			if (!isActive(o, now)) throw new OpportunityError('Cette annonce n’est plus ouverte.');
			const { grantId, unmet } = await conditions(tx, agentId, artistId, o, now);
			if (unmet.length)
				throw new OpportunityError(`Cet artiste ne peut pas candidater : ${unmet.join(', ')}.`);
			if (await tx.application.count({ where: { opportunityId, applicantActorId: artistId } }))
				throw new OpportunityError('Cet artiste a déjà candidaté à cette annonce.');
			const app = await tx.application.create({
				data: {
					opportunityId,
					applicantActorId: artistId,
					sentById: agentId,
					delegated: true,
					message
				},
				select: { id: true }
			});
			await tx.applicationGrantAct.create({
				data: { grantId, kind: 'USED', byId: agentId, applicationId: app.id, createdAt: now }
			});
			const managers = await tx.membership.findMany({
				where: {
					orgId: o.issuerActorId,
					status: 'ACTIVE',
					role: { in: ['OWNER', 'ADMIN'] }
				},
				select: { personId: true }
			});
			for (const recipientId of managers.length
				? managers.map((m) => m.personId)
				: [o.issuerActorId])
				await notify(tx, {
					recipientId,
					type: 'APPLICATION_RECEIVED',
					fromActorId: artistId,
					href: `/annonces/${o.id}`,
					title: o.title
				});
			for (const recipientId of await artistAnswerers(tx, artistId, now))
				await notify(tx, {
					recipientId,
					type: 'APPLICATION_SENT',
					fromActorId: agentId,
					href: `/annonces/${o.id}`,
					title: o.title
				});
			return app;
		},
		{ timeout: 15_000 }
	);
}

/** Droits utilisables pour cette annonce ; lecture seule, aucune donnée d’un autre agent. */
export async function delegatedOptions(agentId: string, opportunityId: string) {
	const now = new Date();
	const o = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
	if (!o || !isActive(o, now) || o.kind === 'RECRUIT_MEMBER') return [];
	const grants = await prisma.applicationGrant.findMany({
		where: {
			grantedAt: { not: null },
			endedAt: null,
			expiresAt: { gt: now },
			representation: { agentId }
		},
		select: {
			representation: { select: { artistId: true, artist: { select: { displayName: true } } } }
		}
	});
	const result = [];
	const seen = new Set<string>();
	for (const { representation: r } of grants) {
		if (seen.has(r.artistId)) continue;
		seen.add(r.artistId);
		try {
			const { unmet, unknown } = await conditions(prisma, agentId, r.artistId, o, now);
			if (
				await prisma.application.count({ where: { opportunityId, applicantActorId: r.artistId } })
			)
				continue;
			result.push({ id: r.artistId, name: r.artist.displayName, unmet, unknown });
		} catch (err) {
			if (!(err instanceof OpportunityError)) throw err;
		}
	}
	return result;
}

/** Envoyées par moi, ou pour un artiste dont je suis la gestion actuelle. */
export async function delegatedApplicationsFor(viewerId: string, opportunityId: string) {
	const rows = await prisma.application.findMany({
		where: {
			opportunityId,
			delegated: true,
			OR: [
				{ sentById: viewerId },
				{ applicantActorId: viewerId },
				{
					applicant: {
						organization: {
							dissolvedAt: null,
							memberships: {
								some: {
									personId: viewerId,
									status: 'ACTIVE',
									role: { in: ['OWNER', 'ADMIN'] }
								}
							}
						}
					}
				}
			]
		},
		select: {
			id: true,
			status: true,
			applicant: { select: { displayName: true } },
			sentBy: { select: { displayName: true } }
		}
	});
	return rows.map((r) => ({
		id: r.id,
		status: r.status,
		artist: r.applicant.displayName,
		sender: r.sentBy?.displayName ?? 'Compte supprimé'
	}));
}
