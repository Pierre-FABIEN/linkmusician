// LINKMUSICIAN: mes morceaux (P3-11) : crédits à confirmer, puis les
// morceaux de mon équipe (les miens, ceux de mes groupes, ceux où j’ai
// un crédit). Service : `#lib/server/works/service`.
import { fail } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { WorkError, confirmCredit, leaveCredit, myWorks } from '#lib/server/works/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	return myWorks(person.actorId);
};

async function run(locals: App.Locals, request: Request, action: 'confirm' | 'decline') {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const workId = String((await request.formData()).get('workId') ?? '');
	try {
		if (action === 'confirm') {
			await confirmCredit(workId, person.actorId);
			return { message: 'C’est confirmé : ton nom figure sur le morceau.' };
		}
		await leaveCredit(workId, person.actorId);
		return { message: 'C’est noté, ton nom n’y figure pas.' };
	} catch (err) {
		if (err instanceof WorkError) return fail(err.status, { error: err.message });
		throw err;
	}
}

export const actions: Actions = {
	confirm: ({ locals, request }) => run(locals, request, 'confirm'),
	decline: ({ locals, request }) => run(locals, request, 'decline')
};
