// LINKMUSICIAN: mes groupes (P3-01) : groupes où je joue, invitations reçues,
// demandes envoyées. Créer un groupe ne rapporte rien : il rapporte quand il
// est formé (2ᵉ membre).
import { fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { BandError, answerInvite, myBands, withdrawPending } from '#lib/server/bands/service';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals }) => {
	return myBands((await me(locals)).actorId);
};

async function run(action: () => Promise<unknown>, message: string) {
	try {
		await action();
		return { message };
	} catch (err) {
		if (err instanceof BandError) return fail(err.status, { error: err.message });
		throw err;
	}
}

export const actions: Actions = {
	accept: async ({ locals, request }) => {
		const id = String((await request.formData()).get('membershipId') ?? '');
		const { actorId } = await me(locals);
		return run(() => answerInvite(id, actorId, true), 'Bienvenue dans le groupe !');
	},
	decline: async ({ locals, request }) => {
		const id = String((await request.formData()).get('membershipId') ?? '');
		const { actorId } = await me(locals);
		return run(() => answerInvite(id, actorId, false), 'Invitation refusée.');
	},
	withdraw: async ({ locals, request }) => {
		const id = String((await request.formData()).get('membershipId') ?? '');
		const { actorId } = await me(locals);
		return run(() => withdrawPending(id, actorId), 'Demande retirée.');
	}
};
