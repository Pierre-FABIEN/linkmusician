/**
 * Endossement reçu d'un collaborateur : une fois par endosseur et par
 * compétence. L'exigence d'une collaboration confirmée entre les deux est
 * vérifiée par le service qui émet l'événement.
 */
import { BAREME } from '../bareme';
import { defineRule } from '../types';

export const endorsementReceived = defineRule({
	id: 'endorsement.received',
	version: BAREME.version,
	on: 'endorsement.received',
	apply(event, ctx) {
		if (event.actorId === event.endorserId) return [];
		if (ctx.hasEndorsement(event.actorId, event.endorserId, event.skill)) return [];
		return [
			{
				actorId: event.actorId,
				track: 'MUSICIAN',
				amount: BAREME.endorsementReceived,
				multiplier: 1,
				ruleId: this.id,
				ruleVersion: this.version,
				reason: `Endossé·e : ${event.skill}`
			}
		];
	}
});
