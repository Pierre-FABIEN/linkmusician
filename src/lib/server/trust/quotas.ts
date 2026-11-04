/**
 * Quotas selon le palier de confiance (P1-09, conception 02 §7).
 *
 * - Quotas par jour (premiers messages à des inconnus) : limiteurs
 *   `rate-limit.ts`, un par quota et par palier, nommés de façon stable
 *   (`quota-<nom>-tl<palier>`). Capacité = limite du palier, rechargée sur 24 h.
 * - Quotas de stock (médias publiés, annonces actives) : comptés par le
 *   service appelant, comparés à la limite du palier.
 */
import { prisma } from '#lib/server';
import { RefillingTokenBucket } from '#lib/server/rate-limit';
import {
	canAddWithinStock,
	isTrustLevel,
	quotaLimit,
	type DailyQuota,
	type StockQuota,
	type TrustLevel
} from '#lib/server/progression/core/trust';

const DAY_SECONDS = 24 * 60 * 60;
const buckets = new Map<string, RefillingTokenBucket<string>>();

/** Limiteur d'un quota journalier pour un palier (un jeton toutes les 24 h / limite). */
export function dailyBucket(quota: DailyQuota, level: TrustLevel) {
	const name = `quota-${quota}-tl${level}`;
	let bucket = buckets.get(name);
	if (!bucket) {
		const max = quotaLimit(level, quota);
		bucket = new RefillingTokenBucket<string>(max, Math.ceil(DAY_SECONDS / max), name);
		buckets.set(name, bucket);
	}
	return bucket;
}

export async function getTrustLevel(actorId: string): Promise<TrustLevel> {
	const actor = await prisma.actor.findUnique({
		where: { id: actorId },
		select: { trustLevel: true }
	});
	return isTrustLevel(actor?.trustLevel) ? actor.trustLevel : 0;
}

/** Consomme une unité d'un quota journalier ; `false` si le quota est épuisé. */
export async function consumeDailyQuota(actorId: string, quota: DailyQuota): Promise<boolean> {
	return dailyBucket(quota, await getTrustLevel(actorId)).consume(actorId, 1);
}

/** Vérifie un quota de stock avant d'ajouter un élément. */
export async function checkStockQuota(actorId: string, quota: StockQuota, current: number) {
	const level = await getTrustLevel(actorId);
	return {
		allowed: canAddWithinStock(level, quota, current),
		limit: quotaLimit(level, quota),
		level
	};
}
