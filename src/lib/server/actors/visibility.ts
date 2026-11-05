/**
 * Filtre en base des acteurs visibles publiquement (P1-11, D19) : ni anonymisé,
 * ni masqué par la personne, ni suspendu. Partagé par le profil `/@handle`,
 * les pages de médias, le sitemap et la messagerie, pour qu'aucune porte ne
 * reste ouverte.
 *
 * Variante par lecteur (P2-05) : avec `viewerId`, un acteur bloqué par le
 * lecteur, ou qui l'a bloqué, n'est pas visible non plus (dans les deux sens).
 */
import type { Prisma } from '@prisma/client';

export function publicActorWhere(
	now: Date = new Date(),
	viewerId?: string | null
): Prisma.ActorWhereInput {
	return {
		deletedAt: null,
		hidden: false,
		sanctions: {
			none: {
				kind: 'SUSPENSION',
				liftedAt: null,
				OR: [{ until: null }, { until: { gt: now } }]
			}
		},
		...(viewerId
			? {
					blocksMade: { none: { blockedActorId: viewerId } },
					blocksReceived: { none: { blockerActorId: viewerId } }
				}
			: {})
	};
}
