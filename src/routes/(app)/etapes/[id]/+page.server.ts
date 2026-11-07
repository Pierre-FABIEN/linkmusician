// LINKMUSICIAN: une étape de groupe à confirmer (P3-05, D43), vue par la
// personne à qui le groupe l'a demandé. 404 pour toute autre personne.
import { error, fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { MilestoneError } from '#lib/server/milestones/service';
import { answerAttestation, attestationPage } from '#lib/server/milestones/proofs';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const { actorId } = await me(locals);
	const step = await attestationPage(params.id, actorId);
	if (!step) error(404, 'Étape introuvable');
	return { step };
};

async function answer(locals: App.Locals, id: string, confirm: boolean) {
	const { actorId } = await me(locals);
	try {
		const { corroborated } = await answerAttestation(id, actorId, confirm);
		return {
			message: !confirm
				? 'C’est noté, merci pour ta franchise.'
				: corroborated
					? 'Merci ! Grâce à toi, l’étape est corroborée.'
					: 'Merci, ta confirmation est enregistrée.'
		};
	} catch (err) {
		if (err instanceof MilestoneError) return fail(err.status, { error: err.message });
		throw err;
	}
}

export const actions: Actions = {
	confirm: ({ locals, params }) => answer(locals, params.id, true),
	decline: ({ locals, params }) => answer(locals, params.id, false)
};
