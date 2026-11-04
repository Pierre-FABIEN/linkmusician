/** Adhésion acceptée à un groupe, avec rendements décroissants par groupe. */
import { BAREME } from '../bareme';
import { diminishingReturn } from '../multipliers';
import { defineRule } from '../types';

export const membershipAccepted = defineRule({
	id: 'membership.accepted',
	version: BAREME.version,
	on: 'membership.accepted',
	apply(event, ctx) {
		const multiplier = diminishingReturn(ctx.priorMemberships(event.personId, event.bandId) + 1);
		const amount = Math.round(BAREME.membershipAccepted * multiplier);
		if (amount <= 0) return [];
		return [
			{
				actorId: event.personId,
				track: 'MUSICIAN',
				amount,
				multiplier,
				ruleId: this.id,
				ruleVersion: this.version,
				reason: multiplier === 1 ? 'Entrée dans un groupe' : `Retour dans un groupe ×${multiplier}`
			}
		];
	}
});
