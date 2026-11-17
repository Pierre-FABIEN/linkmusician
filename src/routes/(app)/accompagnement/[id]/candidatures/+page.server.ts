// LINKMUSICIAN: droit de candidater au nom d'un artiste (DASH-07a, D71).
// Visible seulement de l'agent titulaire et de l'artiste (sa gestion
// majeure). Chaque action est revérifiée par le service sous verrou : un POST
// forgé ne contourne rien. Règles : `#server/representation/applicationGrants`.
import { error, fail } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { RepresentationError } from '#server/representation/service';
import {
	answerGrant,
	endGrant,
	grantsForRepresentation,
	requestGrant
} from '#server/representation/applicationGrants';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const view = await grantsForRepresentation(params.id, (await requirePerson(locals)).actorId);
	if (!view) error(404, 'Accompagnement introuvable.');
	return { view };
};

const guard = async (run: () => Promise<string>) => {
	try {
		return { done: await run() };
	} catch (e) {
		if (e instanceof RepresentationError) return fail(e.status, { error: e.message });
		throw e;
	}
};

export const actions: Actions = {
	request: async ({ locals, params, request }) => {
		const person = await requirePerson(locals);
		const data = await request.formData();
		return guard(async () => {
			await requestGrant(person.actorId, {
				representationId: params.id,
				kinds: data.getAll('kinds').map(String),
				expiresOn: String(data.get('expiresOn') ?? '')
			});
			return 'Demande envoyée. Le droit s’ouvre quand l’artiste l’accorde.';
		});
	},
	answer: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const data = await request.formData();
		const accept = data.get('accept') === '1';
		return guard(async () => {
			await answerGrant(String(data.get('grantId') ?? ''), person.actorId, accept);
			return accept ? 'Droit accordé.' : 'Demande refusée.';
		});
	},
	end: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const data = await request.formData();
		return guard(async () => {
			await endGrant(String(data.get('grantId') ?? ''), person.actorId);
			return 'C’est noté : le droit est terminé.';
		});
	}
};
