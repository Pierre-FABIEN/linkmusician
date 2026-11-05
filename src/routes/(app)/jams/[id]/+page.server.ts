// LINKMUSICIAN: fiche d'une jam publique (P2-14b) : lieu, créneau, places,
// « Je viens » (sans acceptation, sans XP, D27).
import { error, fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { JamError, comeToJam, getJam, notComingToJam } from '#lib/server/jam/publicJams';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const jam = await getJam(params.id, (await me(locals)).actorId);
	if (!jam) error(404, 'Jam introuvable');
	return { jam, published: url.searchParams.has('publiee') };
};

export const actions: Actions = {
	come: async ({ locals, params }) => {
		try {
			await comeToJam(params.id, (await me(locals)).actorId);
			return { message: 'C’est noté : tu viens !' };
		} catch (err) {
			if (err instanceof JamError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	notComing: async ({ locals, params }) => {
		await notComingToJam(params.id, (await me(locals)).actorId);
		return { message: 'Tu ne viens plus.' };
	}
};
