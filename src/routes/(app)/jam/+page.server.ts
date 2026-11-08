// LINKMUSICIAN: accueil du mode jam (P2-12), page-menu (D50) : « Ta
// prochaine étape », puis une entrée par écran (dispos, jams à venir, mes
// jams, lancer une jam, carnet). Seulement des compteurs, aucun contenu.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { canBeAvailable, listAvailableNearby, myAvailability } from '#lib/server/jam/availability';
import { prisma } from '#lib/server';
import { jamNextStep } from '#lib/jam/guide';
import { venuesNear } from '#lib/server/venues/service';
import { myJamInvites, upcomingJamsNear } from '#lib/server/jam/publicJams';
import { myRecentJams } from '#lib/server/jam/afterJam';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const location = await getActorLocation(person.actorId);
	const [mine, canBeDispo, available, jams, invites, recent] = await Promise.all([
		myAvailability(person.actorId),
		canBeAvailable(person.actorId),
		location ? listAvailableNearby(person.actorId) : Promise.resolve([]),
		location ? upcomingJamsNear(person.actorId) : Promise.resolve([]),
		myJamInvites(person.actorId),
		myRecentJams(person.actorId)
	]);
	// Guide « Ta prochaine étape » (P2-12b).
	const [conversations, playedTogether, venuesAdded, nearbyVenues] = await Promise.all([
		prisma.conversationParticipant.count({
			where: {
				actorId: person.actorId,
				state: 'ACCEPTED',
				conversation: { participants: { every: { state: 'ACCEPTED' } } }
			}
		}),
		prisma.collaborationParticipant.count({
			where: {
				actorId: person.actorId,
				collaboration: { status: 'COMPLETED', kind: { in: ['JAM', 'REHEARSAL'] } }
			}
		}),
		prisma.venue.count({ where: { createdById: person.actorId } }),
		location ? venuesNear(person.actorId, { limit: 1 }) : Promise.resolve([])
	]);
	return {
		commune: location?.communeName ?? null,
		canBeDispo,
		mySlot: mine?.slot ?? null,
		availableCount: available.length,
		jamCount: jams.length,
		inviteCount: invites.length,
		/** Jams passées où dire « J'y étais » ou apprécier. */
		recentCount: recent.length,
		nextStep: jamNextStep({
			hasCity: Boolean(location),
			canBeDispo,
			isDispo: Boolean(mine),
			hasConversation: conversations > 0,
			knowsVenues: venuesAdded > 0 || nearbyVenues.length > 0,
			playedTogether
		})
	};
};
