/**
 * Tournée bookée (P5-07, conception 08 §9) : 400 sur la piste booker, × le
 * poids de la meilleure confiance parmi les personnes qui ont confirmé les
 * dates pour l'artiste (hors booker). Chaque date a déjà rapporté
 * `gig.held` ; la tournée s'y ajoute une fois, quand elle se complète.
 */
import { BAREME } from '../bareme';
import { roundMultiplier, trustWeight } from '../multipliers';
import { defineRule } from '../types';

export const tourBooked = defineRule({
	id: 'tour.booked',
	version: BAREME.version,
	on: 'tour.booked',
	apply(event, ctx) {
		const confirmers = [...new Set(event.confirmerIds)].filter((id) => id !== event.bookerId);
		if (confirmers.length === 0) return [];
		const multiplier = roundMultiplier(
			Math.max(...confirmers.map((id) => trustWeight(ctx.trustLevel(id))))
		);
		const amount = Math.round(BAREME.tourBooked * multiplier);
		if (amount <= 0) return [];
		const label = 'Tournée bookée';
		return [
			{
				actorId: event.bookerId,
				track: 'BOOKER',
				amount,
				multiplier,
				ruleId: this.id,
				ruleVersion: this.version,
				reason: multiplier === 1 ? label : `${label} ×${String(multiplier).replace('.', ',')}`
			}
		];
	}
});
