/**
 * Résumé d'un·e musicien·ne (P1-11) : ce que ses événements de domaine
 * établissent, pour en déduire son palier (`musicianTier`) et ses prochains
 * objectifs. Fonction pure : le serveur lit les événements, ce module compte.
 * L'XP n'y entre jamais.
 */
import type { DomainEvent, Milestone } from './events';
import type { MusicianSummary } from './tiers';

/** Étapes de groupe qui valent « sortie » lorsqu'elles sont vérifiées. */
const RELEASES: readonly Milestone[] = ['FIRST_EP', 'FIRST_ALBUM'];

export const EMPTY_MUSICIAN_SUMMARY: MusicianSummary = {
	profileComplete: false,
	reciprocalConversations: 0,
	bands: 0,
	collaborations: 0,
	distinctCollaborators: 0,
	corroboratedGigs: 0,
	verifiedReleases: 0,
	distinctEndorsers: 0,
	jamAppreciations: 0
};

/**
 * Résumé à partir des événements qui concernent l'acteur. Les événements qui
 * ne le concernent pas sont ignorés, et un même fait rejoué (même groupe,
 * même endosseur) ne compte qu'une fois. Une appréciation reprise
 * (`endorsement.revoked`, P2-07) ne compte plus.
 *
 * Les concerts corroborés arrivent avec les événements (phase 3) : en
 * attendant, la première date (`FIRST_GIG`) corroborée compte pour un.
 */
export function musicianSummary(actorId: string, events: readonly DomainEvent[]): MusicianSummary {
	let profileComplete = false;
	let reciprocalConversations = 0;
	let collaborations = 0;
	const bands = new Set<string>();
	const collaborators = new Set<string>();
	/** Appréciations actives par endosseur : reçues moins reprises (P2-07). */
	const endorsers = new Map<string, number>();
	/** Appréciations reçues après une jam, et événements repris (ordre de lecture quelconque). */
	const jamAppreciations = new Set<string>();
	const revokedEvents = new Set<string>();
	const gigs = new Set<string>();
	const releases = new Set<string>();

	for (const event of events) {
		switch (event.type) {
			case 'profile.completed':
				if (event.actorId === actorId) profileComplete = true;
				break;
			case 'conversation.reciprocated':
				if (event.actorId === actorId || event.counterpartId === actorId) {
					reciprocalConversations += 1;
				}
				break;
			case 'membership.accepted':
				if (event.personId === actorId) bands.add(event.bandId);
				break;
			case 'collaboration.completed':
				if (event.participantIds.includes(actorId)) {
					collaborations += 1;
					for (const id of event.participantIds) if (id !== actorId) collaborators.add(id);
				}
				break;
			case 'endorsement.received':
				if (event.actorId === actorId && event.endorserId !== actorId) {
					endorsers.set(event.endorserId, (endorsers.get(event.endorserId) ?? 0) + 1);
					if (event.jamId) jamAppreciations.add(event.id);
				}
				break;
			case 'endorsement.revoked':
				if (event.actorId === actorId) {
					endorsers.set(event.endorserId, (endorsers.get(event.endorserId) ?? 0) - 1);
					revokedEvents.add(event.endorsementEventId);
				}
				break;
			case 'milestone.attested':
				if (!event.memberIds.includes(actorId)) break;
				if (event.milestone === 'FIRST_GIG' && event.to !== 'DECLARED') gigs.add(event.bandId);
				if (RELEASES.includes(event.milestone) && event.to === 'VERIFIED') {
					releases.add(`${event.bandId}|${event.milestone}`);
				}
				break;
			case 'profile.updated':
			case 'media.published':
			case 'jam.attended':
				break;
		}
	}

	return {
		profileComplete,
		reciprocalConversations,
		bands: bands.size,
		collaborations,
		distinctCollaborators: collaborators.size,
		corroboratedGigs: gigs.size,
		verifiedReleases: releases.size,
		distinctEndorsers: [...endorsers.values()].filter((n) => n > 0).length,
		jamAppreciations: [...jamAppreciations].filter((id) => !revokedEvents.has(id)).length
	};
}
