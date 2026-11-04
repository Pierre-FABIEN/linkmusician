/**
 * LINKMUSICIAN: page publique d'un média (P1-08). Seul un média `PUBLISHED`
 * existe publiquement : sinon 404, sans dire s'il existe.
 */
import { error } from '@sveltejs/kit';
import { getPublishedMedia } from '#lib/server/media/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const media = await getPublishedMedia(params.id);
	if (!media) error(404, 'Média introuvable');
	return {
		media: {
			title: media.title,
			externalUrl: media.externalUrl,
			isDemo: media.isDemo,
			instrument: media.instrument?.name ?? null,
			actor: media.actor
		}
	};
};
