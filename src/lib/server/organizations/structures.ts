/** DASH-02a : projection privée de mes seules participations ; aucune liste d'équipe. */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { STRUCTURE_LABELS, participationLabel, structurePermissions } from '#lib/structures/rules';
import { liveStructure } from './access';
import { membershipTimeline } from '#lib/activity/timeline';

const decisionSelection = {
	id: true,
	kind: true,
	occurredAt: true,
	author: { select: { displayName: true, deletedAt: true } }
} satisfies Prisma.MembershipDecisionSelect;
const selection = {
	id: true,
	status: true,
	role: true,
	org: {
		select: { actorId: true, kind: true, actor: { select: { handle: true, displayName: true } } }
	}
} satisfies Prisma.MembershipSelect;
const mineWhere = (personId: string): Prisma.MembershipWhereInput => ({
	personId,
	status: { in: ['ACTIVE', 'INVITED', 'REQUESTED'] },
	org: liveStructure()
});
function projection(row: Prisma.MembershipGetPayload<{ select: typeof selection }>) {
	return {
		id: row.org.actorId,
		membershipId: row.id,
		kind: row.org.kind,
		name: row.org.actor.displayName,
		handle: row.org.actor.handle,
		typeLabel: STRUCTURE_LABELS[row.org.kind],
		status: row.status,
		roleLabel: participationLabel(row.org.kind, row.status, row.role),
		manager: structurePermissions(row.org.kind, row.status, row.role).includes('manage')
	};
}
export async function myStructures(personId: string) {
	const rows = await prisma.membership.findMany({
		where: mineWhere(personId),
		orderBy: [{ org: { actor: { displayName: 'asc' } } }, { id: 'asc' }],
		select: selection
	});
	return rows.map(projection);
}
export async function myStructure(orgId: string, personId: string) {
	const row = await prisma.membership.findFirst({
		where: { ...mineWhere(personId), orgId },
		select: {
			...selection,
			createdAt: true,
			invitedById: true,
			invitedBy: { select: { displayName: true, deletedAt: true } },
			decisions: { select: decisionSelection, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] }
		}
	});
	if (!row) return null;
	const structure = { ...projection(row), activity: membershipTimeline(row) };
	let href: string | null = null;
	if (structure.kind === 'AGENCY') return { ...structure, href: `/agences/${orgId}` };
	if (structure.status === 'INVITED' || structure.status === 'REQUESTED') {
		href =
			structure.kind === 'BAND'
				? '/groupes'
				: structure.kind === 'STUDIO'
					? '/studios'
					: structure.kind === 'SCHOOL'
						? null
						: '/organisations';
	} else if (structure.kind === 'BAND') {
		href = `/groupes/${structure.handle}`;
	} else if (structure.kind === 'SCHOOL') {
		href = `/ecoles/${structure.handle}`;
	} else if (structure.manager) {
		if (structure.kind === 'STUDIO') href = `/studios/${structure.handle}`;
		if (structure.kind === 'PROMOTER') href = `/organisations/${structure.handle}`;
		if (structure.kind === 'VENUE') {
			const venue = await prisma.venue.findFirst({
				where: { claimedByActorId: orgId, removedAt: null },
				select: { id: true }
			});
			if (venue) href = `/lieux/${venue.id}/gerer`;
		}
	}
	return { ...structure, href };
}

/** Historique de mes seules périodes de co-gestion, sans ouvrir les outils. */
export async function myComanagementHistory(personId: string) {
	const rows = await prisma.membership.findMany({
		where: {
			personId,
			person: { deletedAt: null },
			org: { ...liveStructure(), kind: { in: ['PROMOTER', 'VENUE'] } },
			OR: [{ invitedById: { not: null } }, { decisions: { some: {} } }]
		},
		orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
		take: 100,
		select: {
			id: true,
			createdAt: true,
			invitedById: true,
			invitedBy: { select: { displayName: true, deletedAt: true } },
			org: { select: { kind: true, actor: { select: { displayName: true } } } },
			decisions: { select: decisionSelection, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] }
		}
	});
	return rows.map((row) => ({
		id: row.id,
		name: row.org.actor.displayName,
		typeLabel: STRUCTURE_LABELS[row.org.kind],
		activity: membershipTimeline(row)
	}));
}
