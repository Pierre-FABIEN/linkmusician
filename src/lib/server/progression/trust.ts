/**
 * Confiance (P1-09) : résumé d'état lu en base, palier calculé par le noyau pur
 * (`core/trust.ts`), stocké sur l'acteur. Recalculée après chaque événement
 * traité et chaque nuit (`/api/jobs/trust`), rétrogradable. L'XP n'entre
 * jamais dans ce calcul.
 *
 * Imports relatifs : utilisé aussi hors SvelteKit (tests d'intégration).
 */
import {
	computeTrustLevel,
	declineRate,
	isTrustLevel,
	type TrustLevel,
	type TrustSummary
} from './core/trust';
import { DAY_MS } from './core/types';
import { isSanctionActive, reportRate } from '../../moderation/rules';
import { recordDerived, type Tx } from './events';

/** Résumé d'état d'une personne, ou `null` si l'acteur n'est pas une personne. */
export async function trustSummaryFor(
	tx: Tx,
	actorId: string,
	now = new Date()
): Promise<TrustSummary | null> {
	const person = await tx.person.findUnique({
		where: { actorId },
		select: { createdAt: true, user: { select: { emailVerified: true } } }
	});
	if (!person) return null;

	const [
		profileCompleted,
		conversations,
		collaborations,
		sanctions,
		actionedReports,
		publishedMedia
	] = await Promise.all([
		tx.domainEvent.count({ where: { type: 'profile.completed', actorIds: { has: actorId } } }),
		tx.domainEvent.count({
			where: { type: 'conversation.reciprocated', actorIds: { has: actorId } }
		}),
		tx.domainEvent.findMany({
			where: { type: 'collaboration.completed', actorIds: { has: actorId } },
			select: { actorIds: true }
		}),
		// Modération (P1-12) : sanctions en vigueur et signalements retenus sur 90 jours.
		tx.sanction.findMany({
			where: { actorId, liftedAt: null },
			select: { kind: true, until: true, liftedAt: true }
		}),
		tx.report.count({
			where: {
				targetActorId: actorId,
				status: 'ACTIONED',
				handledAt: { gte: new Date(now.getTime() - 90 * DAY_MS) }
			}
		}),
		tx.media.count({ where: { actorId, status: 'PUBLISHED' } })
	]);
	// Blocage et messagerie (P2-05) : signaux de rejet sur 90 jours.
	const since90 = new Date(now.getTime() - 90 * DAY_MS);
	const [blockedBy, requestsSent, requestsDeclined] = await Promise.all([
		tx.block.count({ where: { blockedActorId: actorId, createdAt: { gte: since90 } } }),
		tx.conversation.count({ where: { initiatorId: actorId, createdAt: { gte: since90 } } }),
		tx.conversation.count({
			where: {
				initiatorId: actorId,
				createdAt: { gte: since90 },
				participants: { some: { actorId: { not: actorId }, state: 'DECLINED' } }
			}
		})
	]);
	const counterpartsPerCollab = collaborations.map((c) =>
		c.actorIds.filter((id) => id !== actorId)
	);
	const counterparts = [...new Set(counterpartsPerCollab.flat())];
	const trusted = new Set(
		(
			await tx.actor.findMany({
				where: { id: { in: counterparts }, trustLevel: { gte: 1 } },
				select: { id: true }
			})
		).map((a) => a.id)
	);

	return {
		emailVerified: person.user.emailVerified,
		accountAgeDays: Math.floor((now.getTime() - person.createdAt.getTime()) / DAY_MS),
		profileComplete: profileCompleted > 0,
		reciprocalConversations: conversations,
		collaborationsWithTrusted: counterpartsPerCollab.filter((ids) =>
			ids.some((id) => trusted.has(id))
		).length,
		distinctCounterparts: counterparts.length,
		activeSanctions: sanctions.filter((x) => isSanctionActive(x, now)).length,
		reportRate: reportRate(actionedReports, publishedMedia),
		blockedBy,
		declineRate: declineRate(requestsDeclined, requestsSent)
	};
}

/**
 * Recalcule et enregistre le palier des acteurs donnés (les non-personnes sont
 * ignorées). Renvoie les changements, tracés en événements dérivés.
 */
export async function recomputeTrust(tx: Tx, actorIds: string[], now = new Date()) {
	const changes: { actorId: string; from: TrustLevel; to: TrustLevel }[] = [];
	for (const actorId of [...new Set(actorIds)]) {
		const summary = await trustSummaryFor(tx, actorId, now);
		if (!summary) continue;
		const actor = await tx.actor.findUniqueOrThrow({
			where: { id: actorId },
			select: { trustLevel: true }
		});
		const from = isTrustLevel(actor.trustLevel) ? actor.trustLevel : 0;
		const to = computeTrustLevel(summary);
		await tx.actor.update({
			where: { id: actorId },
			data: { trustLevel: to, trustComputedAt: now }
		});
		if (to !== from) {
			changes.push({ actorId, from, to });
			await recordDerived(tx, 'progress.trust_changed', { actorId, from, to }, [actorId]);
		}
	}
	return changes;
}
