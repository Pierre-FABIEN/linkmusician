/**
 * Conversation réciproque née d'une annonce (l'autre a répondu). Un simple
 * contact ne rapporte rien (§2.1). Plafond par jour glissant.
 */
import { BAREME } from '../bareme';
import { daysBefore, defineRule } from '../types';

export const conversationReciprocated = defineRule({
	id: 'conversation.reciprocated',
	version: BAREME.version,
	on: 'conversation.reciprocated',
	apply(event, ctx) {
		if (!event.fromOpportunity || event.actorId === event.counterpartId) return [];
		const today = ctx.countGains(event.actorId, this.id, daysBefore(ctx.now, 1));
		if (today >= BAREME.reciprocalConversationPerDay) return [];
		return [
			{
				actorId: event.actorId,
				track: 'MUSICIAN',
				amount: BAREME.reciprocalConversation,
				multiplier: 1,
				ruleId: this.id,
				ruleVersion: this.version,
				reason: 'Échange abouti sur une annonce'
			}
		];
	}
});
