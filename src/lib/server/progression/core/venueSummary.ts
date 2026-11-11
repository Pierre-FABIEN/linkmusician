/**
 * Résumé d'un lieu (P5-03b, conception 08 §14) : ce que les dates `gig.held`
 * tenues chez lui établissent, pour son rang (`venueTier`). Fonction pure ;
 * le lieu ne gagne jamais d'XP (Q24) et l'XP n'entre pas ici.
 *
 * Une date ne compte que confirmée par au moins une personne hors
 * organisation et booking, comme pour l'organisateur·rice. Les jams
 * publiques tenues (P5-04) et les groupes passés ensuite au rang Tournée
 * viendront plus tard : `touringAlumni` reste à 0.
 */
import type { DomainEvent, EventOf } from './events';
import type { VenueSummary } from './tiers';

const confirmedOutside = (event: EventOf<'gig.held'>) => {
	const insiders = new Set([...event.organizerIds, ...event.bookerIds]);
	return event.confirmerIds.some((id) => !insiders.has(id));
};

export function venueSummary(
	venueOrgId: string,
	published: boolean,
	events: readonly DomainEvent[]
): VenueSummary & { firstDates: number } {
	const gigs = new Set<string>();
	const artists = new Set<string>();
	const firsts = new Set<string>();
	for (const event of events) {
		if (event.type !== 'gig.held' || event.venueOrgId !== venueOrgId) continue;
		if (gigs.has(event.gigId) || !confirmedOutside(event)) continue;
		gigs.add(event.gigId);
		for (const id of event.performerIds) artists.add(id);
		for (const id of event.firstDateIds) firsts.add(id);
	}
	return {
		published,
		dates: gigs.size,
		distinctArtists: artists.size,
		touringAlumni: 0,
		firstDates: firsts.size
	};
}
