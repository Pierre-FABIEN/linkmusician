/**
 * LINKMUSICIAN: une annonce (P2-02). 404 si l'auteur n'est pas visible
 * (masqué, suspendu, bloqué dans un sens ou dans l'autre) ou si elle a été
 * retirée. L'auteur la clôture ; les autres la signalent. Les candidatures
 * arrivent avec P2-03.
 */
import { error, fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import {
	OpportunityError,
	closeOpportunity,
	getOpportunity
} from '#lib/server/opportunities/service';
import { fileReport, ModerationError } from '#lib/server/moderation/service';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const opportunity = await getOpportunity(params.id, (await me(locals)).actorId);
	if (!opportunity) error(404, 'Annonce introuvable');
	return { opportunity };
};

export const actions: Actions = {
	close: async ({ locals, params }) => {
		try {
			await closeOpportunity((await me(locals)).actorId, params.id);
			return { message: 'Annonce clôturée.' };
		} catch (err) {
			if (err instanceof OpportunityError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	report: async ({ locals, params, request }) => {
		const actorId = (await me(locals)).actorId;
		if (!(await getOpportunity(params.id, actorId))) error(404, 'Annonce introuvable');
		const data = await request.formData();
		try {
			const result = await fileReport(actorId, {
				targetType: 'OPPORTUNITY',
				targetId: params.id,
				reason: String(data.get('reason') ?? ''),
				details: String(data.get('details') ?? '')
			});
			return {
				message: result.alreadyReported
					? 'Tu as déjà signalé cette annonce : elle est en cours d’examen.'
					: 'Merci, ton signalement est transmis à la modération.'
			};
		} catch (err) {
			if (err instanceof ModerationError) return fail(400, { error: err.message });
			throw err;
		}
	}
};
