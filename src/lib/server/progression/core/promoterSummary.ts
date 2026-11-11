/**
 * Résumé d'un·e organisateur·rice (P5-05a, conception 02 §5 et 08 §8) : ce
 * que ses événements `gig.held` établissent, pour en déduire son rang
 * (`promoterTier`) et ses objectifs. Fonction pure ; l'XP n'y entre jamais.
 *
 * Un événement ne compte que **confirmé par au moins une personne hors
 * organisation et booking** (comme la règle `gig.held` : une date confirmée
 * par qui l'organise ne prouve rien). Les événements arrivent avec les
 * concerts vérifiés (P5-06) ; d'ici là, le résumé est vide.
 */
import type { DomainEvent, EventOf } from './events';
import type { PromoterSummary } from './tiers';

/** Un festival (08 §8) : un événement vérifié d'au moins 10 artistes. */
export const FESTIVAL_MIN_ARTISTS = 10;

export type PromoterFacts = PromoterSummary & {
	/** Artistes programmé·es pour leur toute première date. */
	firstDates: number;
};

const confirmedOutside = (event: EventOf<'gig.held'>) => {
	const insiders = new Set([...event.organizerIds, ...event.bookerIds]);
	return event.confirmerIds.some((id) => !insiders.has(id));
};

export function promoterSummary(actorId: string, events: readonly DomainEvent[]): PromoterFacts {
	const gigs = new Set<string>();
	const artists = new Set<string>();
	const firsts = new Set<string>();
	let verifiedFestivals = 0;
	for (const event of events) {
		if (event.type !== 'gig.held' || !event.organizerIds.includes(actorId)) continue;
		if (gigs.has(event.gigId) || !confirmedOutside(event)) continue;
		gigs.add(event.gigId);
		const performers = new Set(event.performerIds);
		for (const id of performers) artists.add(id);
		for (const id of event.firstDateIds) firsts.add(id);
		if (event.verified && performers.size >= FESTIVAL_MIN_ARTISTS) verifiedFestivals += 1;
	}
	return {
		events: gigs.size,
		distinctArtists: artists.size,
		verifiedFestivals,
		firstDates: firsts.size
	};
}
