/**
 * Filtres Prisma des notifications (P2-09), sans dépendance à SvelteKit :
 * partagés par le service et le job du digest.
 */
import type { Prisma } from '@prisma/client';

/** Pas de blocage, dans un sens ou dans l'autre, entre l'auteur et moi. */
export function notBlockedWith(actorId: string): Prisma.NotificationWhereInput {
	return {
		OR: [
			{ fromActorId: null },
			{
				from: {
					blocksMade: { none: { blockedActorId: actorId } },
					blocksReceived: { none: { blockerActorId: actorId } }
				}
			}
		]
	};
}
