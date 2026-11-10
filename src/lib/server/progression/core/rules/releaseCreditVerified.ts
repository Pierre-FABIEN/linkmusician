/**
 * Crédit d'une personne du son sur une sortie vérifiée (P4-01, conception
 * 08 §5 et §7) : 300 XP sur la piste du métier crédité, une fois par
 * sortie (l'unicité est celle de l'événement émis par le service).
 */
import { BAREME } from '../bareme';
import { defineRule } from '../types';

export const releaseCreditVerified = defineRule({
	id: 'release.credit_verified',
	version: BAREME.version,
	on: 'release.credit_verified',
	apply(event) {
		return [
			{
				actorId: event.actorId,
				track: event.track,
				amount: BAREME.releaseCreditVerified,
				multiplier: 1,
				ruleId: this.id,
				ruleVersion: this.version,
				reason: 'Crédit sur une sortie vérifiée'
			}
		];
	}
});
