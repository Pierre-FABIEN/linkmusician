/**
 * Collaboration terminée, confirmée des deux côtés (§2.2, §6). Pour chaque
 * participant, le multiplicateur est la moyenne, sur ses contreparties, de :
 * rendement décroissant (k-ième collaboration avec la même personne sur 12
 * mois) × poids de confiance de la contrepartie. C'est ce qui rend vain le
 * farming entre comptes neufs.
 */
import { BAREME } from '../bareme';
import { diminishingReturn, roundMultiplier, trustWeight } from '../multipliers';
import { daysBefore, defineRule, type XpGain } from '../types';

export const collaborationCompleted = defineRule({
	id: 'collaboration.completed',
	version: BAREME.version,
	on: 'collaboration.completed',
	apply(event, ctx) {
		const since = daysBefore(ctx.now, BAREME.diminishingWindowDays);
		const participants = [...new Set(event.participantIds)];
		if (participants.length < 2) return [];
		const gains: XpGain[] = [];
		for (const person of participants) {
			const others = participants.filter((p) => p !== person);
			const factors = others.map(
				(other) =>
					diminishingReturn(ctx.priorCollaborations(person, other, since) + 1) *
					trustWeight(ctx.trustLevel(other))
			);
			const multiplier = roundMultiplier(factors.reduce((a, b) => a + b, 0) / factors.length);
			const amount = Math.round(BAREME.collaborationCompleted * multiplier);
			if (amount <= 0) continue;
			gains.push({
				actorId: person,
				track: 'MUSICIAN',
				amount,
				multiplier,
				ruleId: this.id,
				ruleVersion: this.version,
				reason:
					multiplier === 1
						? 'Collaboration confirmée'
						: `Collaboration confirmée ×${String(multiplier).replace('.', ',')}`
			});
		}
		return gains;
	}
});
