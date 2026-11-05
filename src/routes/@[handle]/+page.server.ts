/**
 * LINKMUSICIAN: profil public `/@handle` (P1-11). 404 si l'acteur n'existe pas
 * ou n'est pas visible (anonymisé, masqué par la personne, suspendu), sans
 * dire pourquoi. Contenu public seulement (D1) : voir `getPublicProfile`.
 */
import { error, fail, redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getPublicProfile } from '#lib/server/actors/publicProfile';
import { fileReport, ModerationError } from '#lib/server/moderation/service';
import { blockActor, BlockingError } from '#lib/server/blocking/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Les handles sont en minuscules : une seule adresse par profil.
	const handle = params.handle.toLowerCase();
	if (handle !== params.handle) redirect(301, `/@${handle}`);

	const viewer = locals.user ? await getPersonByUserId(locals.user.id) : null;
	// Blocage (P2-05) : 404 dans les deux sens, sans dire pourquoi.
	const profile = await getPublicProfile(handle, new Date(), viewer?.actorId);
	if (!profile) error(404, 'Profil introuvable');

	// L'identifiant interne reste côté serveur.
	const { id: actorId, ...publicProfile } = profile;
	const isOwner = viewer?.actorId === actorId;
	return {
		profile: publicProfile,
		isOwner,
		canReport: Boolean(viewer) && !isOwner
	};
};

export const actions: Actions = {
	/** Signaler le profil (personne connectée, P1-12). */
	report: async ({ params, request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Connecte-toi pour signaler.' });
		const reporter = await getPersonByUserId(locals.user.id);
		if (!reporter) return fail(403, { error: 'Complète ton profil pour signaler.' });
		const profile = await getPublicProfile(
			params.handle.toLowerCase(),
			new Date(),
			reporter.actorId
		);
		if (!profile) error(404, 'Profil introuvable');
		const data = await request.formData();
		try {
			const result = await fileReport(reporter.actorId, {
				targetType: 'ACTOR',
				targetId: profile.id,
				reason: String(data.get('reason') ?? ''),
				details: String(data.get('details') ?? '')
			});
			return {
				reported: result.alreadyReported
					? 'Tu as déjà signalé ce profil : il est en cours d’examen.'
					: 'Merci, ton signalement est transmis à la modération.'
			};
		} catch (err) {
			if (err instanceof ModerationError) return fail(400, { error: err.message });
			throw err;
		}
	},
	/** Bloquer la personne (P2-05) : son profil disparaît aussitôt, dans les deux sens. */
	block: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Connecte-toi pour bloquer.' });
		const me = await getPersonByUserId(locals.user.id);
		if (!me) return fail(403, { error: 'Complète ton profil pour bloquer.' });
		const profile = await getPublicProfile(params.handle.toLowerCase(), new Date(), me.actorId);
		if (!profile) error(404, 'Profil introuvable');
		try {
			await blockActor(me.actorId, profile.id);
		} catch (err) {
			if (err instanceof BlockingError) return fail(400, { error: err.message });
			throw err;
		}
		redirect(303, '/reglages?bloque=1');
	}
};
