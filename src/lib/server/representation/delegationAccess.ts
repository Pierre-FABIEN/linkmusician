/** DASH-04b : garde partagée, sans dépendance au service de représentation. */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { isIndexable } from '#lib/actors/visibility';
import { defaultMandateAction } from '#lib/representation/rules';
import { delegationAllows } from '#lib/representation/delegations';
export type DelegationDb = Prisma.TransactionClient | typeof prisma;
const actor = {
	select: {
		id: true,
		displayName: true,
		deletedAt: true,
		kind: true,
		person: { select: { birthDate: true } },
		organization: { select: { kind: true, dissolvedAt: true } }
	}
} as const;
export const delegationInclude = {
	representation: { include: { agent: actor, artist: actor } },
	agency: { include: { actor: { select: { displayName: true, deletedAt: true } } } },
	delegate: actor,
	agentMembership: true,
	delegateMembership: true,
	proposedBy: { select: { displayName: true } },
	approvedBy: { select: { displayName: true } },
	endedBy: { select: { displayName: true } }
} satisfies Prisma.RepresentationDelegationInclude;
export type DelegationRow = Prisma.RepresentationDelegationGetPayload<{
	include: typeof delegationInclude;
}>;
export async function artistAnswerers(db: DelegationDb, artistId: string, now = new Date()) {
	const person = await db.actor.findFirst({
		where: { id: artistId, deletedAt: null },
		select: {
			kind: true,
			person: { select: { birthDate: true } },
			organization: { select: { kind: true, dissolvedAt: true } }
		}
	});
	if (!person) return [];
	if (person.kind === 'PERSON') return isIndexable(person.person?.birthDate, now) ? [artistId] : [];
	if (person.organization?.kind !== 'BAND' || person.organization.dissolvedAt) return [];
	const members = await db.membership.findMany({
		where: {
			orgId: artistId,
			status: 'ACTIVE',
			role: { in: ['OWNER', 'ADMIN'] },
			person: { deletedAt: null, person: { birthDate: { not: null } } }
		},
		select: { personId: true, person: { select: { person: { select: { birthDate: true } } } } }
	});
	return members.filter((m) => isIndexable(m.person.person?.birthDate, now)).map((m) => m.personId);
}
/** Le mandat et les périodes précises d’adhésion sont relus, sans cache. */
export async function delegationBaseActive(db: DelegationDb, row: DelegationRow, now = new Date()) {
	const p = row.representation;
	if (
		row.endedAt ||
		p.status !== 'CONFIRMED' ||
		(p.startsAt && p.startsAt > now) ||
		(p.expiresAt && p.expiresAt <= now) ||
		(row.expiresAt && row.expiresAt <= now)
	)
		return false;
	if (
		row.agency.kind !== 'AGENCY' ||
		row.agency.dissolvedAt ||
		row.agency.actor.deletedAt ||
		p.agent.deletedAt ||
		p.artist.deletedAt ||
		row.delegate.deletedAt
	)
		return false;
	if (
		!isIndexable(p.agent.person?.birthDate, now) ||
		!isIndexable(row.delegate.person?.birthDate, now)
	)
		return false;
	if (!p.allowedActions.includes(defaultMandateAction(p.kind))) return false;
	const a = row.agentMembership,
		d = row.delegateMembership;
	if (
		a.status !== 'ACTIVE' ||
		d.status !== 'ACTIVE' ||
		a.orgId !== row.agencyId ||
		d.orgId !== row.agencyId ||
		a.personId !== p.agentId ||
		d.personId !== row.delegateId
	)
		return false;
	const answerers = await artistAnswerers(db, p.artistId, now);
	if (!answerers.length) return false;
	if (!(await db.personTrack.count({ where: { personId: p.agentId, track: p.kind } })))
		return false;
	if (
		await db.membership.count({
			where: { orgId: p.artistId, personId: { in: [p.agentId, row.delegateId] }, status: 'ACTIVE' }
		})
	)
		return false;
	return !(await db.block.count({
		where: {
			OR: [
				{ blockerActorId: { in: [p.agentId, row.delegateId] }, blockedActorId: { in: answerers } },
				{ blockedActorId: { in: [p.agentId, row.delegateId] }, blockerActorId: { in: answerers } },
				{ blockerActorId: p.agentId, blockedActorId: row.delegateId },
				{ blockerActorId: row.delegateId, blockedActorId: p.agentId }
			]
		}
	}));
}
export async function delegatedEndAccess(
	db: DelegationDb,
	representationId: string,
	byId: string,
	now: Date
) {
	const rows = await db.representationDelegation.findMany({
		where: { representationId, delegateId: byId, endedAt: null, actions: { has: 'END_MANDATE' } },
		include: delegationInclude,
		orderBy: [{ agencyId: 'asc' }, { id: 'asc' }]
	});
	for (const first of rows) {
		// L’appelant tient déjà le verrou artiste ; même ordre que les décisions.
		await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`org:${first.agencyId}`}))`;
		const row = await db.representationDelegation.findUnique({
			where: { id: first.id },
			include: delegationInclude
		});
		if (
			row &&
			delegationAllows(row, 'END_MANDATE', now) &&
			(await delegationBaseActive(db, row, now))
		)
			return row.id;
	}
	return null;
}
