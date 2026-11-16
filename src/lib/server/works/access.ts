/** Gestion Work : porteur personnel vivant ou gestion active d’un groupe vivant.
 * Les lectures équipe et publiques conservent leurs propres prédicats. */
import type { Prisma } from '@prisma/client';
import { activeBandManager } from '#lib/server/organizations/access';

export function manageableOwnerWhere(personId: string): Prisma.ActorWhereInput {
	return {
		deletedAt: null,
		OR: [
			{ id: personId, kind: 'PERSON' },
			{
				kind: 'ORGANIZATION',
				organization: {
					kind: 'BAND',
					dissolvedAt: null,
					memberships: { some: activeBandManager(personId) }
				}
			}
		]
	};
}
