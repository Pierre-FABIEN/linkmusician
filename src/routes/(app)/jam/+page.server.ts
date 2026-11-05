// LINKMUSICIAN: mode jam (P2-12, P2-13) : « Je suis dispo », les dispos et
// les jams ouvertes autour de moi, « Lancer une jam ».
import { fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { listNearby } from '#lib/server/opportunities/service';
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
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals }) => {
	const person = await me(locals);
	const location = await getActorLocation(person.actorId);
	const [mine, canBeDispo, available, jams] = await Promise.all([
		myAvailability(person.actorId),
		canBeAvailable(person.actorId),
		location ? listAvailableNearby(person.actorId) : Promise.resolve([]),
		location ? listNearby(person.actorId, { kind: 'JAM' }) : Promise.resolve([])
	]);
	// Guide « Ta prochaine étape » (P2-12b).
	const [conversations, confirmedJams] = await Promise.all([
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
		})
	]);
	const nextStep = jamNextStep({
		hasCity: Boolean(location),
		canBeDispo,
		isDispo: Boolean(mine),
		hasConversation: conversations > 0,
		confirmedJams
	});
	return { commune: location?.communeName ?? null, mine, canBeDispo, available, jams, nextStep };
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
