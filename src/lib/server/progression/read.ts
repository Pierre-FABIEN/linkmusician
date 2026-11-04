/**
 * Lecture de la progression d'un acteur pour l'interface (niveau de compte,
 * succès). Jamais de valeur acceptée depuis le client.
 */
import type { PrismaClient } from '@prisma/client';
import { ACHIEVEMENTS_BY_ID } from './core/achievements';
import { levelProgress } from './core/levels';
import { ACCOUNT_TRACK } from './projector';

export async function getProgress(
	actorId: string,
	db: Pick<PrismaClient, 'actorProgress' | 'actorAchievement'>
) {
	const [account, achievements] = await Promise.all([
		db.actorProgress.findUnique({ where: { actorId_track: { actorId, track: ACCOUNT_TRACK } } }),
		db.actorAchievement.findMany({ where: { actorId }, orderBy: { unlockedAt: 'asc' } })
	]);
	return {
		xp: account?.xp ?? 0,
		...levelProgress(account?.xp ?? 0),
		achievements: achievements.map((a) => ({
			id: a.achievementId,
			name: ACHIEVEMENTS_BY_ID.get(a.achievementId)?.name ?? a.achievementId,
			description: ACHIEVEMENTS_BY_ID.get(a.achievementId)?.description ?? '',
			unlockedAt: a.unlockedAt
		}))
	};
}
