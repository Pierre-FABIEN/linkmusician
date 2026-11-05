/**
 * Tableau de bord de progression (P1-11) : niveau et XP, palier, trois
 * prochains objectifs, confiance, derniers gains et succès. Tout est calculé
 * ici, côté serveur ; la page ne fait qu'afficher.
 */
import { prisma } from '#lib/server';
import { nextObjectives, questProgress, type QuestState } from './core/quests';
import type { MusicianSummary } from './core/tiers';
import {
	computeTrustLevel,
	nextTrustRequirements,
	TRUST_NAMES,
	TRUST_PERMISSIONS
} from './core/trust';
import { achievementCatalog, getMusicianTier, getProgress, getXpHistory } from './read';
import { trustSummaryFor } from './trust';

/** État du profil utile aux objectifs (ce que le résumé d'événements ne dit pas). */
export async function questStateFor(
	actorId: string,
	summary: MusicianSummary
): Promise<QuestState> {
	const [instruments, genres, location, actor, demos] = await Promise.all([
		prisma.personInstrument.count({ where: { personId: actorId } }),
		prisma.actorGenre.count({ where: { actorId } }),
		prisma.actorLocation.count({ where: { actorId } }),
		prisma.actor.findUniqueOrThrow({ where: { id: actorId }, select: { bio: true } }),
		prisma.media.count({ where: { actorId, status: 'PUBLISHED', isDemo: true } })
	]);
	return {
		...summary,
		hasInstrument: instruments > 0,
		hasGenre: genres > 0,
		hasZone: location > 0,
		hasBio: Boolean(actor.bio?.trim()),
		demos
	};
}

export async function getDashboard(actorId: string) {
	const [progress, tier, history, trustSummary] = await Promise.all([
		getProgress(actorId, prisma),
		getMusicianTier(actorId, prisma),
		getXpHistory(actorId, prisma),
		trustSummaryFor(prisma, actorId)
	]);
	const questState = await questStateFor(actorId, tier.summary);
	const objectives = nextObjectives(questState);
	// Confiance recalculée à la volée, comme dans `/reglages`.
	const trustLevel = trustSummary ? computeTrustLevel(trustSummary) : 0;
	const nextTrust = trustSummary
		? nextTrustRequirements(trustSummary)
		: { next: 1 as const, requirements: [] };
	return {
		level: progress.level,
		xp: progress.xp,
		xpIntoLevel: progress.xpIntoLevel,
		xpForNextLevel: progress.xpForNextLevel,
		tier: tier.tier,
		objectives,
		/** Avancement global (« Étape X sur N », P2-12b). */
		questProgress: questProgress(questState),
		trust: {
			name: TRUST_NAMES[trustLevel],
			dailyFirstMessages: TRUST_PERMISSIONS[trustLevel].dailyFirstMessages,
			nextName: nextTrust.next === null ? null : TRUST_NAMES[nextTrust.next],
			requirements: nextTrust.requirements
		},
		history,
		achievements: achievementCatalog(progress.achievements)
	};
}
