// LINKMUSICIAN: carnet de jams et réseau musical (P2-16). Privé : seule la
// personne voit son carnet et son réseau.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { jamLog } from '#lib/server/jam/log';
import { leaveNetwork, myNetwork } from '#lib/server/network/service';
import { currentTip } from '#lib/server/guide/service';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals }) => {
	const person = await me(locals);
	const { actorId } = person;
	const [log, network, tip] = await Promise.all([
		jamLog(actorId),
		myNetwork(actorId),
		// Conseil en contexte (P2-17).
		currentTip('carnet', person)
	]);
	return { ...log, network, tip };
};

export const actions: Actions = {
	leave: async ({ locals, request }) => {
		const handle = String((await request.formData()).get('handle') ?? '');
		await leaveNetwork((await me(locals)).actorId, handle);
		return { message: 'Retiré·e de ton réseau.' };
	}
};
