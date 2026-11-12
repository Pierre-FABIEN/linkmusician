// LINKMUSICIAN: mode jam, écran « Mes jams » (D50) : les invitations du lead
// (P2-14c) et les dernières jams, « Tu y étais ? » (P2-15) ; les invitations
// à animer les scènes ouvertes d'un lieu et les lieux où l'on anime (P5-04b).
import { fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { JamError, myJamInvites } from '#lib/server/jam/publicJams';
import { myRecentJams } from '#lib/server/jam/afterJam';
import {
	answerVenueHostInvite,
	myVenueHostings,
	myVenueHostInvites,
	removeVenueHost
} from '#lib/server/jam/venueHosts';
import type { Actions, PageServerLoad } from './$types';

const me = async (locals: App.Locals) => (await getPersonByUserId(locals.user!.id))!;

export const load: PageServerLoad = async ({ locals }) => {
	const person = await me(locals);
	const [invites, recent, hostInvites, hostings] = await Promise.all([
		myJamInvites(person.actorId),
		myRecentJams(person.actorId),
		myVenueHostInvites(person.actorId),
		myVenueHostings(person.actorId)
	]);
	return { invites, recent, hostInvites, hostings };
};

export const actions: Actions = {
	answerHost: async ({ locals, request }) => {
		const person = await me(locals);
		const data = await request.formData();
		const accept = data.get('accept') === '1';
		try {
			await answerVenueHostInvite(String(data.get('hostId') ?? ''), person.actorId, accept);
		} catch (err) {
			if (err instanceof JamError) return fail(err.status, { error: err.message });
			throw err;
		}
		return {
			message: accept
				? 'C’est fait : tu animes au lieu. Il peut te confier ses soirées.'
				: 'Invitation déclinée.'
		};
	},
	leaveHost: async ({ locals, request }) => {
		const person = await me(locals);
		const hostId = String((await request.formData()).get('hostId') ?? '');
		try {
			await removeVenueHost(hostId, person.actorId);
		} catch (err) {
			if (err instanceof JamError) return fail(err.status, { error: err.message });
			throw err;
		}
		return { message: 'Tu n’animes plus à ce lieu.' };
	}
};
