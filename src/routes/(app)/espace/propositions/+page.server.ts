// LINKMUSICIAN: « Ce que Melokiva me propose » (N4, conception 21 §8.6) :
// les règles et branches écartées, les reports en cours, et leur
// réactivation. Une préférence d'affichage, jamais un droit.
import { fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import {
	ChoiceError,
	chooserOf,
	choicesPage,
	declineTarget,
	reactivate
} from '#lib/server/career/choices';
import { BRANCH_INFO, type CareerBranch } from '#lib/career/map';
import { targetOf } from '#lib/career/next';
import type { Actions, PageServerLoad } from './$types';

/** Branches qui ont des suggestions facultatives aujourd'hui (rangs 4 et 5). */
const BRANCHES_WITH_OPTIONS: readonly CareerBranch[] = [
	'EQUIPE',
	'CREATION',
	'PRODUCTION',
	'SCENE'
];

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const { declined, later } = await choicesPage(person.actorId);
	const hidden = new Set(declined.map((d) => targetOf(d.target)));
	return {
		declined: declined.map((d) => ({ id: d.id, label: d.label })),
		later,
		branches: BRANCHES_WITH_OPTIONS.filter((b) => !hidden.has(`branch:${b}`)).map((b) => ({
			target: `branch:${b}`,
			label: BRANCH_INFO[b].label,
			pitch: BRANCH_INFO[b].pitch
		}))
	};
};

const ownerOf = async (locals: App.Locals) => (await chooserOf(locals)).actorId;

const field = async (request: Request, name: string) => {
	const raw = (await request.formData()).get(name);
	return typeof raw === 'string' ? raw : '';
};

export const actions: Actions = {
	reactivate: async ({ locals, request }) => {
		const ownerId = await ownerOf(locals);
		try {
			await reactivate(ownerId, await field(request, 'id'));
			return {
				message: 'Réactivé : ces suggestions peuvent revenir dès qu’elles ont lieu d’être.'
			};
		} catch (err) {
			if (err instanceof ChoiceError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	decline: async ({ locals, request }) => {
		const ownerId = await ownerOf(locals);
		try {
			const { label } = await declineTarget(ownerId, await field(request, 'target'));
			return { message: `C’est noté : « ${label} » ne te sera plus proposé.` };
		} catch (err) {
			if (err instanceof ChoiceError) return fail(err.status, { error: err.message });
			throw err;
		}
	}
};
