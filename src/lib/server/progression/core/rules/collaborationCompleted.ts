/**
 * Collaboration terminée, confirmée des deux côtés (§2.2, §6). Pour chaque
 * participant, le multiplicateur est la moyenne, sur ses contreparties, de :
 * rendement décroissant (k-ième collaboration avec la même personne sur 12
 * mois) × poids de confiance de la contrepartie. C'est ce qui rend vain le
 * farming entre comptes neufs.
 *
 * Qui exerce un métier du son sur la collaboration (`services`, P4-01) gagne
 * la valeur de sa prestation sur la piste de ce métier (D20), avec les mêmes
 * multiplicateurs : rendement décroissant **par artiste**, confiance de
 * l'artiste. Les autres gagnent la collaboration sur la piste musicien.
 */
import { BAREME } from '../bareme';
import { SERVICE_REASON, SERVICE_TRACK } from '../crafts';
import { diminishingReturn, roundMultiplier, trustWeight } from '../multipliers';
import { daysBefore, defineRule, type Track, type XpGain } from '../types';

const factor = (multiplier: number) => String(multiplier).replace('.', ',');

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
			const service = event.services?.[person];
			const base = service ? BAREME.services[service] : BAREME.collaborationCompleted;
			const track: Track = service ? SERVICE_TRACK[service] : 'MUSICIAN';
			const label = service ? SERVICE_REASON[service] : 'Collaboration confirmée';
			const amount = Math.round(base * multiplier);
			if (amount <= 0) continue;
			gains.push({
				actorId: person,
				track,
				amount,
				multiplier,
				ruleId: this.id,
				ruleVersion: this.version,
				reason: multiplier === 1 ? label : `${label} ×${factor(multiplier)}`
			});
		}
		return gains;
	}
});
