/**
 * Accompagnement confirmé par l'artiste (P5-01, conception 08 §9 et §10).
 * Le manager gagne 200 sur sa piste, × rendement décroissant par artiste
 * (un accompagnement repris dans l'année vaut moitié, puis un quart, puis
 * rien) × confiance de la personne qui confirme pour l'artiste.
 *
 * Le booker ne gagne rien à l'accompagnement : ses points viennent des
 * dates bookées et jouées (`gig.held`). L'accompagnement compte pour son
 * rang (Premier artiste). La part de 10 % sur un rang franchi par
 * l'artiste est reportée (Q21).
 */
import { BAREME } from '../bareme';
import { diminishingReturn, roundMultiplier, trustWeight } from '../multipliers';
import { daysBefore, defineRule } from '../types';

export const managementConfirmed = defineRule({
	id: 'management.confirmed',
	version: BAREME.version,
	on: 'management.confirmed',
	apply(event, ctx) {
		if (event.kind !== 'MANAGER') return [];
		const { managerId, artistId, confirmedById } = event;
		if (artistId === managerId || confirmedById === managerId) return [];
		const since = daysBefore(ctx.now, BAREME.diminishingWindowDays);
		const multiplier = roundMultiplier(
			diminishingReturn(ctx.priorManagements(managerId, artistId, since) + 1) *
				trustWeight(ctx.trustLevel(confirmedById))
		);
		const amount = Math.round(BAREME.managementConfirmed * multiplier);
		if (amount <= 0) return [];
		const label = 'Accompagnement confirmé par l’artiste';
		return [
			{
				actorId: managerId,
				track: 'MANAGER',
				amount,
				multiplier,
				ruleId: this.id,
				ruleVersion: this.version,
				reason: multiplier === 1 ? label : `${label} ×${String(multiplier).replace('.', ',')}`
			}
		];
	}
});
