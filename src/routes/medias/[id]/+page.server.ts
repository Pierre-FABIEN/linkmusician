/**
 * LINKMUSICIAN: page publique d'un média (P1-08). Seul un média `PUBLISHED`
 * existe publiquement : sinon 404, sans dire s'il existe.
 */
import { error, fail } from '@sveltejs/kit';
import { getPublishedMedia } from '#lib/server/media/service';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { fileReport, ModerationError } from '#lib/server/moderation/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Blocage (P2-05) : invisible entre deux personnes séparées par un blocage.
	const viewer = locals.user ? await getPersonByUserId(locals.user.id) : null;
	const media = await getPublishedMedia(params.id, viewer?.actorId);
	if (!media) error(404, 'Média introuvable');
	return {
		media: {
			title: media.title,
			kind: media.kind,
			externalUrl: media.externalUrl,
			fileUrl: media.fileUrl,
			isDemo: media.isDemo,
			instrument: media.instrument?.name ?? null,
			actor: media.actor
		},
		canReport: Boolean(locals.user)
	};
};

export const actions: Actions = {
	/** Signaler le média ou le profil de son auteur (personne connectée). */
	report: async ({ params, request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Connecte-toi pour signaler.' });
		const reporter = await getPersonByUserId(locals.user.id);
		if (!reporter) return fail(403, { error: 'Complète ton profil pour signaler.' });
		const media = await getPublishedMedia(params.id, reporter.actorId);
		if (!media) error(404, 'Média introuvable');
		const data = await request.formData();
		const target = data.get('target') === 'ACTOR' ? 'ACTOR' : 'MEDIA';
		try {
			const result = await fileReport(reporter.actorId, {
				targetType: target,
				targetId: target === 'ACTOR' ? media.actorId : media.id,
				reason: String(data.get('reason') ?? ''),
				details: String(data.get('details') ?? '')
			});
			return {
				reported: result.alreadyReported
					? 'Tu as déjà signalé ce contenu : il est en cours d’examen.'
					: 'Merci, ton signalement est transmis à la modération.'
			};
		} catch (err) {
			if (err instanceof ModerationError) return fail(400, { error: err.message });
			throw err;
		}
	}
};
