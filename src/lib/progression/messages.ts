/**
 * Messages de progression affichés après une action (module pur). L'XP est
 * calculée côté serveur ; ce module ne fait que la mettre en mots.
 */
import { ACHIEVEMENTS_BY_ID } from '#lib/server/progression/core/achievements';

export type ProgressNews = {
	xp: number;
	achievements: string[];
	levelUp: { from: number; to: number } | null;
};

export function progressMessage(base: string, news: ProgressNews): string {
	const parts = [base];
	if (news.xp > 0) parts.push(`+${news.xp} XP`);
	if (news.levelUp) parts.push(`Niveau ${news.levelUp.to} atteint !`);
	for (const id of news.achievements) {
		parts.push(`Succès débloqué : ${ACHIEVEMENTS_BY_ID.get(id)?.name ?? id}`);
	}
	return parts.join(' · ');
}
