// LINKMUSICIAN: carnet de jams et réseau musical (P2-16). Privé : seule la
// personne voit son carnet et son réseau.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { jamLog } from '#lib/server/jam/log';
import { leaveNetwork, myNetwork } from '#lib/server/network/service';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals }) => {
	const { actorId } = await me(locals);
	const [log, network] = await Promise.all([jamLog(actorId), myNetwork(actorId)]);
	return { ...log, network };
};

export const actions: Actions = {
	leave: async ({ locals, request }) => {
		const handle = String((await request.formData()).get('handle') ?? '');
		await leaveNetwork((await me(locals)).actorId, handle);
		return { message: 'Retiré·e de ton réseau.' };
	}
};
