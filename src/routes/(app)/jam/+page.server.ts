// LINKMUSICIAN: mode jam (P2-12, P2-13) : « Je suis dispo », les dispos et
// les jams ouvertes autour de moi, « Lancer une jam ».
import { fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import {
	AvailabilityError,
	canBeAvailable,
	clearAvailability,
	listAvailableNearby,
	myAvailability,
	setAvailability
} from '#lib/server/jam/availability';
import { AVAILABILITY_SLOTS, type AvailabilitySlotValue } from '#lib/jam/availability';
import { prisma } from '#lib/server';
import { jamNextStep } from '#lib/jam/guide';
import { venuesNear } from '#lib/server/venues/service';
import { myJamInvites, upcomingJamsNear } from '#lib/server/jam/publicJams';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals }) => {
	const person = await me(locals);
	const location = await getActorLocation(person.actorId);
	const [mine, canBeDispo, available, jams, invites] = await Promise.all([
		myAvailability(person.actorId),
		canBeAvailable(person.actorId),
		location ? listAvailableNearby(person.actorId) : Promise.resolve([]),
		location ? upcomingJamsNear(person.actorId) : Promise.resolve([]),
		// Invitations du lead en attente de réponse (P2-14c).
		myJamInvites(person.actorId)
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
		location ? venuesNear(person.actorId, { limit: 3 }) : Promise.resolve([])
	]);
	const nextStep = jamNextStep({
		hasCity: Boolean(location),
		canBeDispo,
		isDispo: Boolean(mine),
		hasConversation: conversations > 0,
		knowsVenues: venuesAdded > 0 || nearbyVenues.length > 0,
		playedTogether
	});
	return {
		commune: location?.communeName ?? null,
		mine,
		canBeDispo,
		available,
		jams,
		invites,
		venues: nearbyVenues,
		nextStep
	};
};

export const actions: Actions = {
	dispo: async ({ locals, request }) => {
		const data = await request.formData();
		const slot = String(data.get('slot') ?? '');
		if (!(AVAILABILITY_SLOTS as readonly string[]).includes(slot)) {
			return fail(400, { error: 'Choisis un créneau.' });
		}
		try {
			await setAvailability(
				(await me(locals)).actorId,
				slot as AvailabilitySlotValue,
				String(data.get('note') ?? '')
			);
			return { message: 'C’est noté : les musicien·nes du coin savent que tu veux jouer.' };
		} catch (err) {
			if (err instanceof AvailabilityError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	pasDispo: async ({ locals }) => {
		await clearAvailability((await me(locals)).actorId);
		return { message: 'Tu n’es plus affiché·e comme dispo.' };
	}
};
