// LINKMUSICIAN: « Mes studios » (P4-03a) : les studios que je gère, et la
// création d'une fiche. Réservé aux ingés son et producteur·rices
// (conception 06 §3.3) ; les autres voient comment ajouter le métier.
// Invitations à gérer un studio (P4-03b).
import { fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import {
	answerStudioInvite,
	canOpenStudio,
	createStudio,
	myStudioInvites,
	myStudios,
	StudioError
} from '#lib/server/studios/service';
import { studioSchema } from '#lib/studios/rules';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	const [canOpen, studios, invites] = await Promise.all([
		canOpenStudio(person.actorId),
		myStudios(person.actorId),
		myStudioInvites(person.actorId)
	]);
	return { canOpen, studios, invites };
};

export const actions: Actions = {
	/** Accepter ou décliner une invitation à gérer un studio (P4-03b). */
	answer: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const data = await request.formData();
		const accept = data.get('accept') === '1';
		try {
			await answerStudioInvite(String(data.get('membershipId') ?? ''), person.actorId, accept);
		} catch (err) {
			if (err instanceof StudioError) return fail(err.status, { inviteError: err.message });
			throw err;
		}
		return { answered: accept ? 'Tu gères maintenant ce studio.' : 'Invitation déclinée.' };
	},
	create: async ({ locals, request }) => {
		const person = await requirePerson(locals);
		const name = String((await request.formData()).get('name') ?? '');
		const parsed = studioSchema.safeParse({ name });
		if (!parsed.success) {
			return fail(400, { name, error: parsed.error.issues[0]?.message ?? 'Vérifie le nom.' });
		}
		let handle: string;
		try {
			({ handle } = await createStudio(person.actorId, parsed.data));
		} catch (err) {
			if (err instanceof StudioError) return fail(err.status, { name, error: err.message });
			throw err;
		}
		redirect(303, `/studios/${handle}?cree=1`);
	}
};
