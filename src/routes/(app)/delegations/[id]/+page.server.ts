import { error, fail } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { RepresentationError } from '#server/representation/service';
import {
	delegationForMe,
	answerDelegation,
	approveDelegation,
	revokeDelegation,
	endDelegatedRepresentation
} from '#server/representation/delegations';
import type { Actions, PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, params }) => {
	const delegation = await delegationForMe(params.id, (await requirePerson(locals)).actorId);
	if (!delegation) error(404, 'Affectation introuvable.');
	return { delegation };
};
export const actions: Actions = {
	answer: async ({ locals, params, request }) => {
		try {
			await answerDelegation(
				params.id,
				(await requirePerson(locals)).actorId,
				(await request.formData()).get('accept') === '1'
			);
			return { done: 'Réponse enregistrée.' };
		} catch (e) {
			if (e instanceof RepresentationError) return fail(e.status, { error: e.message });
			throw e;
		}
	},
	approve: async ({ locals, params, request }) => {
		try {
			await approveDelegation(
				params.id,
				(await requirePerson(locals)).actorId,
				(await request.formData()).get('accept') === '1'
			);
			return { done: 'Décision enregistrée.' };
		} catch (e) {
			if (e instanceof RepresentationError) return fail(e.status, { error: e.message });
			throw e;
		}
	},
	revoke: async ({ locals, params }) => {
		try {
			await revokeDelegation(params.id, (await requirePerson(locals)).actorId);
			return { done: 'Affectation retirée.' };
		} catch (e) {
			if (e instanceof RepresentationError) return fail(e.status, { error: e.message });
			throw e;
		}
	},
	end: async ({ locals, params, request }) => {
		if ((await request.formData()).get('confirm') !== '1')
			return fail(400, { error: 'Confirme la fin de l’accompagnement.' });
		try {
			await endDelegatedRepresentation(params.id, (await requirePerson(locals)).actorId);
			return { done: 'Accompagnement terminé.' };
		} catch (e) {
			if (e instanceof RepresentationError) return fail(e.status, { error: e.message });
			throw e;
		}
	}
};
