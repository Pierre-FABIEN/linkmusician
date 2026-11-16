/** DASH-02a : toute autorisation est relue en base, y compris dans une transaction. */
import type { OrgKind, Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { STRUCTURE_LABELS, structurePermissions } from '#lib/structures/rules';

// Vérification à la compilation : chaque type réellement en base a une définition.
const kinds: Record<OrgKind, string> = STRUCTURE_LABELS;
export const liveStructure = (kind?: OrgKind) => ({
	...(kind ? { kind } : {}),
	dissolvedAt: null,
	actor: { deletedAt: null }
});

export async function structureAccess(
	db: Prisma.TransactionClient | typeof prisma,
	orgId: string,
	personId: string,
	expectedKind?: OrgKind
) {
	const membership = await db.membership.findFirst({
		where: { orgId, personId, status: 'ACTIVE', org: liveStructure(expectedKind) },
		select: { id: true, role: true, org: { select: { kind: true } } }
	});
	if (!membership || !kinds[membership.org.kind]) return null;
	return {
		id: membership.id,
		role: membership.role,
		kind: membership.org.kind,
		permissions: structurePermissions(membership.org.kind, 'ACTIVE', membership.role)
	};
}

/** Même prédicat pour les listes de groupes gérés et les commandes Work.
 * Il ne confère ni visibilité publique ni appartenance à une équipe. */
export function activeBandManager(personId: string): Prisma.MembershipWhereInput {
	return {
		personId,
		status: 'ACTIVE',
		role: { in: ['OWNER', 'ADMIN'] },
		org: liveStructure('BAND')
	};
}
