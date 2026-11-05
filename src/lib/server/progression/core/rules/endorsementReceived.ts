/**
 * Appréciation reçue (D27, P2-15) : un·e autre présent·e d'une jam salue une
 * qualité ou un instrument. Environ 40 XP, avec des rendements décroissants
 * par paire (1, 0,5, 0,25 puis 0 sur un an glissant) : deux complices ne
 * peuvent pas se faire monter indéfiniment. La présence commune, la
 * confiance TL1 de l'endosseur et l'unicité par paire et par jam sont
 * vérifiées par le service qui émet l'événement.
 */
import { BAREME } from '../bareme';
import { daysBefore, defineRule } from '../types';

export const endorsementReceived = defineRule({
	id: 'endorsement.received',
	version: BAREME.version,
	on: 'endorsement.received',
	apply(event, ctx) {
		if (event.actorId === event.endorserId) return [];
		const prior = ctx.priorEndorsements(
			event.actorId,
			event.endorserId,
			daysBefore(ctx.now, BAREME.diminishingWindowDays)
		);
		const factor = BAREME.diminishing[prior] ?? 0;
		const amount = Math.round(BAREME.endorsementReceived * factor);
		if (amount <= 0) return [];
		return [
			{
				actorId: event.actorId,
				track: 'MUSICIAN',
				amount,
				multiplier: factor,
				ruleId: this.id,
				ruleVersion: this.version,
				reason:
					factor === 1
						? `Appréciation : ${event.skill}`
						: `Appréciation : ${event.skill} ×${String(factor).replace('.', ',')}`
			}
		];
	}
});
