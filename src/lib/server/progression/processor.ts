/**
 * Processeur de progression (conception 03 §2.4) : charge le contexte, appelle
 * les règles pures, inscrit les gains, met à jour les projections et les
 * succès, puis marque l'événement traité. Idempotent : un événement déjà
 * traité est ignoré, et la contrainte d'unicité du registre empêche tout
 * double crédit en cas de rejeu concurrent.
 */
import { gainsFor } from './core/engine';
import type { XpGain } from './core/types';
import { loadRuleContext } from './context';
import { actorIdsOf, emit, toDomainEvent, type NewDomainEvent, type Tx } from './events';
import { appendGains, reverseTransaction } from './ledger';
import { projectActors, recordProgressEvents, unlockAchievements } from './projector';
import { recomputeTrust } from './trust';

export type ProcessResult = {
	eventId: string;
	skipped: boolean;
	gains: XpGain[];
	inserted: number;
	levelUps: { actorId: string; from: number; to: number }[];
	achievements: { actorId: string; achievementId: string }[];
};

export async function processEvent(tx: Tx, eventId: string): Promise<ProcessResult> {
	const row = await tx.domainEvent.findUniqueOrThrow({ where: { id: eventId } });
	const empty = { eventId, gains: [], inserted: 0, levelUps: [], achievements: [] };
	if (row.processedAt || row.type.startsWith('progress.')) return { ...empty, skipped: true };

	const event = toDomainEvent(row);
	// Verrou par acteur jusqu'à la fin de la transaction : deux événements
	// simultanés pour une même personne ne lisent pas le même historique (sans
	// quoi un gain « une fois » pourrait être crédité deux fois).
	for (const actorId of [...actorIdsOf(event)].sort()) {
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${actorId}))`;
	}
	const ctx = await loadRuleContext(tx, event, row.createdAt);
	const gains = gainsFor(event, ctx);
	const inserted = await appendGains(tx, event.id, gains);
	const levelUps = await projectActors(
		tx,
		gains.map((g) => g.actorId)
	);
	const achievements = await unlockAchievements(tx, event, gains);
	await recordProgressEvents(tx, event.id, levelUps, achievements);
	// Événement significatif : la confiance des personnes concernées est
	// recalculée (après les règles, qui ont lu la confiance d'avant).
	await recomputeTrust(tx, actorIdsOf(event));
	await tx.domainEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
	return { eventId, skipped: false, gains, inserted, levelUps, achievements };
}

/** Émet puis traite un événement, dans la transaction de l'appelant. */
export async function emitAndProcess(tx: Tx, input: NewDomainEvent) {
	const row = await emit(tx, input);
	return processEvent(tx, row.id);
}

/**
 * Annule un gain (preuve invalidée, contestation retenue) : ligne négative
 * liée au registre, puis projection recalculée. C'est la seule façon
 * d'annuler : ne jamais appeler `reverseTransaction` sans reprojeter.
 */
export async function reverseGain(tx: Tx, transactionId: string, reason: string) {
	const reversal = await reverseTransaction(tx, transactionId, reason);
	if (reversal) await projectActors(tx, [reversal.actorId]);
	return reversal;
}
