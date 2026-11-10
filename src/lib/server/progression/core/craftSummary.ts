/**
 * Résumé d'une personne d'un métier du son (P4-02b) : ce que ses événements
 * établissent sur une piste, pour en déduire son rang (`craftTier`) et ses
 * prochains objectifs. Fonction pure : le serveur lit les événements et
 * compte les travaux en écoute, ce module compte le reste. L'XP n'y entre
 * jamais.
 */
import { CRAFT_SERVICES, SERVICE_TRACK, type CraftService, type CraftTrack } from './crafts';
import type { DomainEvent } from './events';
import type { CraftSummary } from './tiers';

export type CraftFacts = CraftSummary & {
	/** Prestations confirmées, par type. */
	byService: Record<CraftService, number>;
};

export function craftSummary(
	actorId: string,
	track: CraftTrack,
	events: readonly DomainEvent[],
	listeningWorks: number
): CraftFacts {
	const byService = Object.fromEntries(CRAFT_SERVICES.map((s) => [s, 0])) as Record<
		CraftService,
		number
	>;
	const collaborations = new Set<string>();
	const artists = new Set<string>();
	const releases = new Set<string>();
	for (const event of events) {
		if (event.type === 'collaboration.completed') {
			const service = event.services?.[actorId];
			if (!service || SERVICE_TRACK[service] !== track) continue;
			if (!event.participantIds.includes(actorId) || collaborations.has(event.collaborationId))
				continue;
			collaborations.add(event.collaborationId);
			byService[service] += 1;
			// Les artistes : qui ne fait pas de prestation sur cette collaboration.
			for (const id of event.participantIds)
				if (id !== actorId && !event.services?.[id]) artists.add(id);
		}
		if (
			event.type === 'release.credit_verified' &&
			event.actorId === actorId &&
			event.track === track
		)
			releases.add(event.releaseId);
	}
	return {
		listeningWorks,
		projects: collaborations.size,
		distinctArtists: artists.size,
		verifiedReleaseCredits: releases.size,
		byService
	};
}
