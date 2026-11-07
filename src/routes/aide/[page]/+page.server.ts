// LINKMUSICIAN: une page du centre d'aide (`src/lib/aide/pages/*.md`).
import { error } from '@sveltejs/kit';
import { helpPage } from '#lib/aide/catalog';
import { renderedHelpPage } from '#lib/server/aide/render';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const page = params.page ? helpPage(params.page) : null;
	const help = page ? renderedHelpPage(page.file) : null;
	if (!page || !help) error(404, 'Page d’aide introuvable');
	return { page, help };
};
