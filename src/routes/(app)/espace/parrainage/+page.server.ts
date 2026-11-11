// LINKMUSICIAN: parrainage (P4-13b, conception 07 §4.8) : présenter deux
// personnes de son réseau musical ; succès Passeur si elles collaborent.
import { fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import {
	IntroductionError,
	canIntroduce,
	introduce,
	introducibleContacts,
	myIntroductions
} from '#lib/server/career/introductions';
import type { Actions, PageServerLoad } from './$types';

async function me(locals: App.Locals) {
	return (await getPersonByUserId(locals.user!.id))!;
}

export const load: PageServerLoad = async ({ locals }) => {
	const { actorId } = await me(locals);
	const eligible = await canIntroduce(actorId);
	const [contacts, introductions] = await Promise.all([
		eligible ? introducibleContacts(actorId) : [],
		myIntroductions(actorId)
	]);
	return {
		eligible,
		contacts: contacts.map((c) => ({ handle: c.handle, displayName: c.displayName })),
		introductions
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const { actorId } = await me(locals);
		const data = await request.formData();
		const values = {
			first: String(data.get('first') ?? ''),
			second: String(data.get('second') ?? ''),
			note: String(data.get('note') ?? '')
		};
		try {
			const { first, second } = await introduce(actorId, values);
			return { message: `C’est fait : ${first} et ${second} sont prévenu·es.` };
		} catch (err) {
			if (err instanceof IntroductionError) return fail(err.status, { error: err.message, values });
			throw err;
		}
	}
};
