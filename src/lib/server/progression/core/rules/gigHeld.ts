/**
 * Concert tenu et confirmé (P5-01, conception 08 §8, §9 et §14).
 *
 * - Chaque personne qui **organise** gagne l'événement tenu (200) sur la
 *   piste organisateur·rice ; chaque personne qui a **booké** (sans
 *   organiser) gagne la date bookée et jouée (150) sur la piste booker.
 * - Multiplicateur : moyenne, sur les artistes de l'affiche, du rendement
 *   décroissant par paire (k-ième date avec le même artiste sur 12 mois ;
 *   pour un booker, au même lieu, car rebooker un artiste ailleurs est son
 *   métier),
 *   × poids de la meilleure confiance parmi les personnes qui ont confirmé
 *   pour les artistes. Une date confirmée seulement par qui l'organise ou
 *   la booke ne rapporte rien.
 * - Les musicien·nes de l'affiche n'y gagnent **rien** : la collaboration et
 *   l'étape `FIRST_GIG` les créditent déjà. Le lieu gagne un rang (Q24).
 *
 * `gig.first_dates` crédite à part (une règle distincte, car le registre
 * n'admet qu'un gain par règle, acteur et piste) les artistes programmés
 * pour leur toute première date : 100 par artiste, pour qui organise.
 */
import { BAREME } from '../bareme';
import { diminishingReturn, roundMultiplier, trustWeight } from '../multipliers';
import type { EventOf } from '../events';
import { daysBefore, defineRule, type RuleContext, type XpGain } from '../types';

const factor = (multiplier: number) => String(multiplier).replace('.', ',');
const unique = (ids: readonly string[]) => [...new Set(ids)];

/** Qui organise, qui booke (sans organiser), et la confiance retenue. */
function roles(event: EventOf<'gig.held'>, ctx: RuleContext) {
	const organizers = unique(event.organizerIds);
	const bookers = unique(event.bookerIds).filter((id) => !organizers.includes(id));
	const insiders = new Set([...organizers, ...bookers]);
	const confirmers = unique(event.confirmerIds).filter((id) => !insiders.has(id));
	const trust = confirmers.length
		? Math.max(...confirmers.map((id) => trustWeight(ctx.trustLevel(id))))
		: 0;
	return { organizers, bookers, trust };
}

/** Artistes de l'affiche, hors la personne elle-même (qui joue à sa propre date). */
const performersFor = (event: EventOf<'gig.held'>, personId: string) =>
	unique(event.performerIds).filter((id) => id !== personId);

export const gigHeld = defineRule({
	id: 'gig.held',
	version: BAREME.version,
	on: 'gig.held',
	apply(event, ctx) {
		const { organizers, bookers, trust } = roles(event, ctx);
		if (trust === 0) return [];
		const since = daysBefore(ctx.now, BAREME.diminishingWindowDays);
		const gains: XpGain[] = [];
		const credit = (personId: string, organizer: boolean) => {
			const performers = performersFor(event, personId);
			if (!performers.length) return;
			const returns = performers.map((p) =>
				diminishingReturn(
					ctx.priorGigs(personId, p, since, organizer ? undefined : event.venueOrgId) + 1
				)
			);
			const multiplier = roundMultiplier(
				(returns.reduce((a, b) => a + b, 0) / returns.length) * trust
			);
			const base = organizer ? BAREME.gigHeld : BAREME.gigBooked;
			const amount = Math.round(base * multiplier);
			if (amount <= 0) return;
			const label = organizer ? 'Événement tenu' : 'Date bookée et jouée';
			gains.push({
				actorId: personId,
				track: organizer ? 'PROMOTER' : 'BOOKER',
				amount,
				multiplier,
				ruleId: this.id,
				ruleVersion: this.version,
				reason: multiplier === 1 ? label : `${label} ×${factor(multiplier)}`
			});
		};
		for (const id of organizers) credit(id, true);
		for (const id of bookers) credit(id, false);
		return gains;
	}
});

export const gigFirstDates = defineRule({
	id: 'gig.first_dates',
	version: BAREME.version,
	on: 'gig.held',
	apply(event, ctx) {
		const { organizers, trust } = roles(event, ctx);
		if (trust === 0) return [];
		const gains: XpGain[] = [];
		for (const personId of organizers) {
			const performers = performersFor(event, personId);
			const firsts = unique(event.firstDateIds).filter((id) => performers.includes(id));
			if (!firsts.length) continue;
			const multiplier = roundMultiplier(trust);
			const amount = Math.round(BAREME.gigFirstDate * firsts.length * multiplier);
			if (amount <= 0) continue;
			const label =
				firsts.length === 1
					? 'Artiste programmé pour sa première date'
					: `${firsts.length} artistes programmés pour leur première date`;
			gains.push({
				actorId: personId,
				track: 'PROMOTER',
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
