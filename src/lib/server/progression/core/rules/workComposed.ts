/**
 * Morceau composé à plusieurs (D35, conception 06 §4.3). Chaque contributeur
 * confirmé reçoit 150 XP, une fois par morceau, × la moyenne, sur les autres
 * contributeurs, de : rendement décroissant (k-ième morceau avec la même
 * personne sur 12 mois) × poids de confiance de l'autre, comme une
 * collaboration. Qui confirme son rôle plus tard reçoit sa part à ce
 * moment-là (`work.credit_confirmed`). Seul·e, rien : pas d'événement.
 */
import { BAREME } from '../bareme';
import { diminishingReturn, roundMultiplier, trustWeight } from '../multipliers';
import { daysBefore, defineRule, type RuleContext, type XpGain } from '../types';

function share(
	ctx: RuleContext,
	rule: { id: string; version: number },
	workId: string,
	person: string,
	others: string[]
): XpGain | null {
	if (others.length === 0 || ctx.creditedOnWork(person, workId)) return null;
	const since = daysBefore(ctx.now, BAREME.diminishingWindowDays);
	const factors = others.map(
		(other) =>
			diminishingReturn(ctx.priorCoWorks(person, other, since, workId) + 1) *
			trustWeight(ctx.trustLevel(other))
	);
	const multiplier = roundMultiplier(factors.reduce((a, b) => a + b, 0) / factors.length);
	const amount = Math.round(BAREME.workComposed * multiplier);
	if (amount <= 0) return null;
	return {
		actorId: person,
		track: 'MUSICIAN',
		amount,
		multiplier,
		ruleId: rule.id,
		ruleVersion: rule.version,
		reason:
			multiplier === 1
				? 'Morceau composé à plusieurs'
				: `Morceau composé à plusieurs ×${String(multiplier).replace('.', ',')}`
	};
}

export const workComposed = defineRule({
	id: 'work.composed',
	version: BAREME.version,
	on: 'work.composed',
	apply(event, ctx) {
		const people = [...new Set(event.contributorIds)];
		if (people.length < 2) return [];
		return people.flatMap((person) => {
			const gain = share(
				ctx,
				this,
				event.workId,
				person,
				people.filter((p) => p !== person)
			);
			return gain ? [gain] : [];
		});
	}
});

export const workCreditConfirmed = defineRule({
	id: 'work.credit_confirmed',
	version: BAREME.version,
	on: 'work.credit_confirmed',
	apply(event, ctx) {
		const others = [...new Set(event.otherIds)].filter((p) => p !== event.personId);
		const gain = share(ctx, this, event.workId, event.personId, others);
		return gain ? [gain] : [];
	}
});
