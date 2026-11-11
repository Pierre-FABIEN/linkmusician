/**
 * Jam publique tenue (P5-04a, conception 02 §2.2 et 08 §14).
 *
 * - Chaque personne qui **organise** (la gestion du lieu qui l'a publiée)
 *   gagne 50 sur la piste organisateur·rice, × la meilleure confiance parmi
 *   les présent·es hors organisation.
 * - Il faut au moins 3 présent·es hors organisation : une jam où l'on ne
 *   vient pas ne rapporte rien.
 * - Les présent·es n'y gagnent **rien** (D27) : seules leurs appréciations
 *   rapportent. Le lieu y gagne un rang, pas d'XP (Q24).
 */
import { BAREME } from '../bareme';
import { roundMultiplier, trustWeight } from '../multipliers';
import { defineRule, type XpGain } from '../types';

const unique = (ids: readonly string[]) => [...new Set(ids)];

export const jamHeld = defineRule({
	id: 'jam.held',
	version: BAREME.version,
	on: 'jam.held',
	apply(event, ctx) {
		const organizers = unique(event.organizerIds);
		const present = unique(event.confirmerIds).filter((id) => !organizers.includes(id));
		if (present.length < BAREME.jamHeldMinPresent) return [];
		const multiplier = roundMultiplier(
			Math.max(...present.map((id) => trustWeight(ctx.trustLevel(id))))
		);
		const amount = Math.round(BAREME.jamHeld * multiplier);
		if (amount <= 0) return [];
		const label = 'Jam publique tenue';
		return organizers.map((actorId): XpGain => ({
			actorId,
			track: 'PROMOTER',
			amount,
			multiplier,
			ruleId: this.id,
			ruleVersion: this.version,
			reason: multiplier === 1 ? label : `${label} ×${String(multiplier).replace('.', ',')}`
		}));
	}
});
