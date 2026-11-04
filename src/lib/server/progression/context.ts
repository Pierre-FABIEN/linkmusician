/**
 * Contexte des règles, chargé depuis la base avant l'appel au noyau pur. Les
 * règles sont synchrones : on précharge l'historique utile des acteurs
 * concernés, puis on répond depuis la mémoire.
 *
 * « Antérieur » s'entend dans l'ordre des événements (`occurredAt`, puis date
 * d'écriture) : le résultat ne dépend pas de l'ordre de traitement.
 */
import type { DomainEvent } from './core/events';
import type { TrustLevel } from './core/trust';
import type { RuleContext } from './core/types';
import { actorIdsOf, type Tx } from './events';

/**
 * Confiance provisoire, en attendant son calcul (lot P1-09) : 0 pour tous.
 * Elle ne pèse que sur les collaborations (×0,1), qui n'existent pas encore.
 */
export const PROVISIONAL_TRUST: TrustLevel = 0;

export async function loadRuleContext(
	tx: Tx,
	event: DomainEvent,
	createdAt: Date,
	trustOf: (actorId: string) => TrustLevel = () => PROVISIONAL_TRUST
): Promise<RuleContext> {
	const actors = actorIdsOf(event);
	const isPrior = (e: { id: string; occurredAt: Date; createdAt: Date }) =>
		e.id !== event.id &&
		(e.occurredAt < event.occurredAt ||
			(e.occurredAt.getTime() === event.occurredAt.getTime() && e.createdAt < createdAt));

	const [gains, related] = await Promise.all([
		tx.xpTransaction.findMany({
			where: { actorId: { in: actors }, reversesId: null, reversedBy: null },
			select: {
				actorId: true,
				ruleId: true,
				sourceEvent: { select: { id: true, occurredAt: true, createdAt: true } }
			}
		}),
		tx.domainEvent.findMany({
			where: {
				type: { in: ['collaboration.completed', 'membership.accepted', 'endorsement.received'] },
				actorIds: { hasSome: actors }
			},
			select: {
				id: true,
				type: true,
				payload: true,
				actorIds: true,
				occurredAt: true,
				createdAt: true
			}
		})
	]);
	const priorGains = gains.filter((g) => isPrior(g.sourceEvent));
	const prior = related.filter(isPrior);
	const payloadOf = (e: (typeof prior)[number]) => e.payload as Record<string, unknown>;

	return {
		now: event.occurredAt,
		countGains: (actorId, ruleId, since) =>
			priorGains.filter(
				(g) =>
					g.actorId === actorId &&
					g.ruleId === ruleId &&
					(!since || g.sourceEvent.occurredAt >= since)
			).length,
		priorCollaborations: (a, b, since) =>
			prior.filter(
				(e) =>
					e.type === 'collaboration.completed' &&
					e.occurredAt >= since &&
					e.actorIds.includes(a) &&
					e.actorIds.includes(b)
			).length,
		priorMemberships: (personId, bandId) =>
			prior.filter(
				(e) =>
					e.type === 'membership.accepted' &&
					payloadOf(e).personId === personId &&
					payloadOf(e).bandId === bandId
			).length,
		hasEndorsement: (actorId, endorserId, skill) =>
			prior.some(
				(e) =>
					e.type === 'endorsement.received' &&
					payloadOf(e).actorId === actorId &&
					payloadOf(e).endorserId === endorserId &&
					payloadOf(e).skill === skill
			),
		trustLevel: trustOf
	};
}
