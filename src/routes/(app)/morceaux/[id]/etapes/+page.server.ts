// LINKMUSICIAN: « Qui prend en charge ? » (DASH-06a, #51, D68). Écran dédié
// d'une étape de production : l'équipe du morceau voit qui s'en charge ; la
// personne responsable fait avancer le statut. Le formulaire n'envoie qu'une
// intention : statut, dates, mode et lieu sont calculés par le serveur.
import { error, fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { WorkError, workPage } from '#lib/server/works/service';
import { applyWorkStep, workStepsFor } from '#lib/server/works/steps';
import { craftAnnounceHref } from '#lib/works/rules';
import { workStepFormSchema, type WorkStepAct } from '#lib/works/steps';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { actorId } = (await getPersonByUserId(locals.user!.id))!;
	const [work, steps] = await Promise.all([
		workPage(params.id, actorId),
		workStepsFor(params.id, actorId)
	]);
	// Hors équipe : rien ne dit que l'étape existe.
	if (!work || !steps) error(404, 'Morceau introuvable');
	return {
		work: { id: work.id, title: work.title, manage: work.manage },
		steps,
		// « Un·e professionnel·le externe » : le parcours d'annonce existant (P4-05).
		externalHref: work.manage
			? craftAnnounceHref({
					workId: work.id,
					workTitle: work.title,
					target: 'SOUND_ENGINEER',
					specialty: 'RECORDING'
				})
			: null
	};
};

const MESSAGES: Record<WorkStepAct, string> = {
	CLAIMED: 'C’est noté : tu prends l’enregistrement en charge.',
	STARTED: 'Enregistrement commencé.',
	FINISHED: 'Enregistrement déclaré terminé.',
	RESET: 'L’étape est remise à faire.',
	REOPENED: 'L’étape est rouverte.',
	RELEASED: 'L’étape est libérée.'
};

export const actions: Actions = {
	step: async ({ locals, params, request }) => {
		const { actorId } = (await getPersonByUserId(locals.user!.id))!;
		const parsed = workStepFormSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: 'Action inconnue.' });
		try {
			const result = await applyWorkStep(params.id, actorId, parsed.data);
			return {
				message: result.changed ? MESSAGES[result.act!] : 'Rien à changer : c’est déjà fait.'
			};
		} catch (err) {
			if (err instanceof WorkError) return fail(err.status, { error: err.message });
			throw err;
		}
	}
};
