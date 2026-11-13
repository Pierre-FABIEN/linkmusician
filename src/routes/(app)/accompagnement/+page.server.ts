// LINKMUSICIAN: « Accompagnement » (P5-07) : d'un côté, les propositions de
// managers et de bookers à trancher pour moi ou mes groupes, et les
// accompagnements en cours ; de l'autre, si j'ai le métier, les artistes que
// je propose d'accompagner. `?artiste=handle` préremplit la proposition
// (lien depuis un profil public). Règles : `#server/representation/service`.
import { fail } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import {
	agentKindsOf,
	answerRepresentation,
	endRepresentation,
	myRepresentations,
	proposeRepresentation,
	representationsForMe,
	RepresentationError
} from '#lib/server/representation/service';
import {
	representationProposalSchema,
	mandateScopeSchema,
	defaultMandateAction
} from '#lib/representation/rules';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = await requirePerson(locals);
	const [kinds, mine, forMe] = await Promise.all([
		agentKindsOf(person.actorId),
		myRepresentations(person.actorId),
		representationsForMe(person.actorId)
	]);
	const artist =
		url.searchParams
			.get('artiste')
			?.replace(/[^a-z0-9_-]/gi, '')
			.slice(0, 60) ?? '';
	return {
		kinds,
		mine,
		requests: forMe.filter((r) => r.status === 'PROPOSED'),
		current: forMe.filter((r) => r.status === 'CONFIRMED'),
		artist
	};
};

const guard = async <T>(run: () => Promise<T>, key: 'error' | 'proposeError' = 'error') => {
	try {
		return await run();
	} catch (err) {
		if (err instanceof RepresentationError) return fail(err.status, { [key]: err.message });
		throw err;
	}
};

export const actions: Actions = {
	propose: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const data = Object.fromEntries(await request.formData());
		const parsed = representationProposalSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, {
				proposeError: parsed.error.issues[0]?.message ?? 'Vérifie le formulaire.',
				artist: String(data.artist ?? '')
			});
		}
		return guard(async () => {
			const scope = mandateScopeSchema.safeParse({
				startsOn: data.startsOn || undefined,
				expiresOn: data.expiresOn || undefined,
				departmentCodes: String(data.departments ?? '')
					.split(',')
					.map((v) => v.trim().toUpperCase())
					.filter(Boolean),
				allowedActions: [defaultMandateAction(parsed.data.kind)]
			});
			if (!scope.success)
				return fail(400, { proposeError: scope.error.issues[0]?.message ?? 'Périmètre invalide.' });
			const name = await proposeRepresentation(person.actorId, parsed.data, new Date(), scope.data);
			return { done: `Proposition envoyée à ${name}. Elle compte dès sa confirmation.` };
		}, 'proposeError');
	},
	answer: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const data = await request.formData();
		const accept = data.get('accept') === '1';
		return guard(async () => {
			await answerRepresentation(String(data.get('id') ?? ''), person.actorId, accept);
			return {
				done: accept ? 'C’est confirmé : l’accompagnement commence.' : 'Proposition déclinée.'
			};
		});
	},
	end: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const id = String((await request.formData()).get('id') ?? '');
		return guard(async () => {
			await endRepresentation(id, person.actorId);
			return { done: 'C’est noté.' };
		});
	}
};
