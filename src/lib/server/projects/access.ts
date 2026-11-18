/**
 * Gestion d'un projet (P2, D72 I7) : celle de son porteur, relue à chaque
 * écriture et jamais stockée. La personne elle-même, ou une adhésion ACTIVE
 * OWNER/ADMIN d'une organisation vivante admise (BAND, PROMOTER, STUDIO,
 * VENUE). Un simple membre ne gère pas le projet de son groupe (I2).
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { structureAccess } from '#lib/server/organizations/access';
import { isAllowedOwner, PROJECT_OWNER_ORG_KINDS } from '#lib/projects/rules';

type Db = Prisma.TransactionClient | typeof prisma;

/** Porteurs que la personne gère : prédicat des lectures (fiche, listes). */
export function projectManagerWhere(personId: string): Prisma.ActorWhereInput {
	return {
		deletedAt: null,
		OR: [
			{ id: personId, kind: 'PERSON' },
			{
				kind: 'ORGANIZATION',
				organization: {
					kind: { in: [...PROJECT_OWNER_ORG_KINDS] },
					dissolvedAt: null,
					memberships: {
						some: { personId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } }
					}
				}
			}
		]
	};
}

export type ProjectOwnerHead = {
	id: string;
	kind: 'PERSON' | 'ORGANIZATION';
	deletedAt: Date | null;
	organization: { kind: string; dissolvedAt: Date | null } | null;
};

export const ownerHeadSelect = {
	id: true,
	kind: true,
	deletedAt: true,
	organization: { select: { kind: true, dissolvedAt: true } }
} as const;

/** Verrou sous lequel la gouvernance du porteur change : `band:` pour un
 * groupe (bands/service), `studio:` pour un studio, `org:` pour un lieu ou
 * une organisation (comanagement). Aucun pour une personne. */
export function ownerLockKey(owner: ProjectOwnerHead): string | null {
	if (owner.kind !== 'ORGANIZATION') return null;
	switch (owner.organization?.kind) {
		case 'BAND':
			return `band:${owner.id}`;
		case 'STUDIO':
			return `studio:${owner.id}`;
		default:
			return `org:${owner.id}`;
	}
}

/** Point de décision des écritures, à appeler sous le verrou du porteur. */
export async function managesOwner(db: Db, owner: ProjectOwnerHead, personId: string) {
	if (owner.deletedAt || !isAllowedOwner(owner.kind, owner.organization?.kind)) return false;
	if (owner.kind === 'PERSON') return owner.id === personId;
	const access = await structureAccess(db, owner.id, personId);
	return !!access && access.permissions.includes('manage');
}

/** Moi, puis les structures admises que je gère : choix du porteur. */
export async function manageableProjectOwners(personId: string) {
	const actors = await prisma.actor.findMany({
		where: projectManagerWhere(personId),
		select: { id: true, kind: true, displayName: true, organization: { select: { kind: true } } },
		orderBy: { displayName: 'asc' }
	});
	return actors
		.map((a) => ({
			id: a.id,
			name: a.displayName,
			isMe: a.id === personId,
			orgKind: a.organization?.kind ?? null
		}))
		.sort((a, b) => Number(b.isMe) - Number(a.isMe));
}
