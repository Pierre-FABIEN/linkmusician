// LINKMUSICIAN: fiche d'un studio (P4-03a), pour sa gestion (OWNER, ADMIN) :
// nom, présentation, ville (centre de commune seulement), services, salles,
// tarifs, matériel, horaires ; publication (rang « Ouvert ») ; photos (P4-03b). Ce qui
// s'affiche sur la page publique `/@handle` une fois publiée.
import { error, fail, redirect } from '@sveltejs/kit';
import { requirePerson } from '#server/actors/tracksForm';
import { getCommune } from '#lib/server/geo/communes';
import {
	deleteStudioPhoto,
	inviteStudioManager,
	leaveOrRemoveStudioManager,
	setStudioPublished,
	studioForManager,
	StudioError,
	updateStudio
} from '#lib/server/studios/service';
import { studioProfileSchema } from '#lib/studios/rules';
import type { Actions, PageServerLoad } from './$types';

async function managed(locals: App.Locals, handle: string) {
	const person = await requirePerson(locals);
	const studio = await studioForManager(handle, person.actorId);
	if (!studio) error(404, 'Studio introuvable');
	return { actorId: person.actorId, studio };
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { studio } = await managed(locals, params.handle);
	// L'identifiant interne reste côté serveur.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { id: _id, ...rest } = studio;
	return { studio: rest, created: url.searchParams.has('cree') };
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		const { actorId, studio } = await managed(locals, params.handle);
		let payload: unknown;
		try {
			payload = JSON.parse(String((await request.formData()).get('payload') ?? ''));
		} catch {
			return fail(400, { error: 'Le formulaire est illisible : recharge la page.' });
		}
		const parsed = studioProfileSchema.safeParse(payload);
		if (!parsed.success) {
			const fields: Record<string, string> = {};
			for (const issue of parsed.error.issues) fields[issue.path.join('.')] ??= issue.message;
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Vérifie la fiche.', fields });
		}
		const { communeCode, ...fiche } = parsed.data;
		let commune = null;
		if (communeCode) {
			try {
				commune = await getCommune(communeCode);
			} catch {
				return fail(502, {
					error: 'Le service des communes ne répond pas. Réessaie dans un instant.'
				});
			}
			if (!commune) return fail(400, { error: 'Choisis une commune dans la liste.' });
		}
		try {
			const { unpublished } = await updateStudio(studio.id, actorId, { ...fiche, commune });
			return {
				message: unpublished
					? 'Fiche enregistrée. Il lui manque des éléments : elle n’est plus publiée.'
					: 'Fiche enregistrée.'
			};
		} catch (err) {
			if (err instanceof StudioError) return fail(err.status, { error: err.message });
			throw err;
		}
	},
	publish: async ({ locals, params }) => {
		const { actorId, studio } = await managed(locals, params.handle);
		try {
			await setStudioPublished(studio.id, actorId, true);
		} catch (err) {
			if (err instanceof StudioError) return fail(err.status, { error: err.message });
			throw err;
		}
		return { message: 'Ta fiche est publiée : ton studio est Ouvert.' };
	},
	deletePhoto: async ({ locals, params, request }) => {
		const { actorId, studio } = await managed(locals, params.handle);
		const mediaId = String((await request.formData()).get('mediaId') ?? '');
		try {
			await deleteStudioPhoto(studio.id, actorId, mediaId);
		} catch (err) {
			if (err instanceof StudioError) return fail(err.status, { error: err.message });
			throw err;
		}
		return { message: 'Photo retirée.' };
	},
	/** Inviter une personne à gérer le studio (P4-03b). */
	inviteManager: async ({ locals, params, request }) => {
		const { actorId, studio } = await managed(locals, params.handle);
		const handle = String((await request.formData()).get('handle') ?? '');
		try {
			const name = await inviteStudioManager(studio.id, actorId, handle);
			return { message: `Invitation envoyée à ${name}.` };
		} catch (err) {
			if (err instanceof StudioError) return fail(err.status, { teamError: err.message, handle });
			throw err;
		}
	},
	/** Retirer une personne, annuler une invitation, ou quitter la gestion. */
	removeManager: async ({ locals, params, request }) => {
		const { actorId, studio } = await managed(locals, params.handle);
		const membershipId = String((await request.formData()).get('membershipId') ?? '');
		const leaving = studio.team.some((m) => m.membershipId === membershipId && m.isMe);
		try {
			await leaveOrRemoveStudioManager(studio.id, actorId, membershipId);
		} catch (err) {
			if (err instanceof StudioError) return fail(err.status, { teamError: err.message });
			throw err;
		}
		if (leaving) redirect(303, '/studios');
		return { message: 'C’est fait.' };
	},
	unpublish: async ({ locals, params }) => {
		const { actorId, studio } = await managed(locals, params.handle);
		await setStudioPublished(studio.id, actorId, false);
		return { message: 'Ta fiche n’est plus visible.' };
	}
};
