/**
 * Registre de l'XP, en ajout seul (déclencheur en base). L'idempotence repose
 * sur la contrainte d'unicité (événement, règle, acteur, piste) : rejouer un
 * événement n'ajoute rien.
 */
import type { XpGain } from './core/types';
import type { Tx } from './events';

/** Inscrit les gains d'un événement ; renvoie le nombre de lignes ajoutées. */
export async function appendGains(tx: Tx, sourceEventId: string, gains: readonly XpGain[]) {
	if (gains.length === 0) return 0;
	const { count } = await tx.xpTransaction.createMany({
		data: gains.map((g) => ({
			actorId: g.actorId,
			track: g.track,
			amount: g.amount,
			sourceEventId,
			ruleId: g.ruleId,
			ruleVersion: g.ruleVersion,
			multiplier: g.multiplier,
			reason: g.reason
		})),
		skipDuplicates: true
	});
	return count;
}

/**
 * Annule une transaction : nouvelle ligne négative liée (`reversesId`),
 * jamais de modification. Sans effet si elle est déjà annulée. Ne recalcule
 * pas la projection : passer par `reverseGain` (`processor.ts`).
 */
export async function reverseTransaction(tx: Tx, transactionId: string, reason: string) {
	const original = await tx.xpTransaction.findUniqueOrThrow({
		where: { id: transactionId },
		include: { reversedBy: { select: { id: true } } }
	});
	if (original.reversedBy || original.reversesId) return null;
	return tx.xpTransaction.create({
		data: {
			actorId: original.actorId,
			track: original.track,
			amount: -original.amount,
			sourceEventId: original.sourceEventId,
			ruleId: `${original.ruleId}#annulation`,
			ruleVersion: original.ruleVersion,
			multiplier: original.multiplier,
			reason: `Annulé : ${reason}`,
			reversesId: original.id
		}
	});
}
