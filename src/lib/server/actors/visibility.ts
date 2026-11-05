/**
 * Filtre en base des acteurs visibles publiquement (P1-11, D19) : ni anonymisé,
 * ni masqué par la personne, ni suspendu. Partagé par le profil `/@handle`,
 * les pages de médias et le sitemap, pour qu'aucune porte ne reste ouverte.
 */
import type { Prisma } from '@prisma/client';

export function publicActorWhere(now: Date = new Date()): Prisma.ActorWhereInput {
	return {
		deletedAt: null,
		hidden: false,
		sanctions: {
			none: {
				kind: 'SUSPENSION',
				liftedAt: null,
				OR: [{ until: null }, { until: { gt: now } }]
			}
		}
	};
}
