/** Profil complété (≥1 instrument, ≥1 genre, zone, bio) : une seule fois. */
import { BAREME } from '../bareme';
import { defineRule } from '../types';

export const profileCompleted = defineRule({
	id: 'profile.completed',
	version: BAREME.version,
	on: 'profile.completed',
	apply(event, ctx) {
		if (ctx.countGains(event.actorId, this.id) > 0) return [];
		return [
			{
				actorId: event.actorId,
				track: 'MUSICIAN',
				amount: BAREME.profileCompleted,
				multiplier: 1,
				ruleId: this.id,
				ruleVersion: this.version,
				reason: 'Profil complété'
			}
		];
	}
});
