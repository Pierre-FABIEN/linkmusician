// LINKMUSICIAN: accueil du centre d'aide (`src/lib/aide/pages/00-accueil.md`).
import { error } from '@sveltejs/kit';
import { helpPage } from '#lib/aide/catalog';
import { renderedHelpPage } from '#lib/server/aide/render';
import { helpTopics } from '#lib/server/aide/directory';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const page = helpPage('')!;
	const help = renderedHelpPage(page.file);
	if (!help) error(404, 'Page introuvable');
	return { page, help, topics: helpTopics().map(({ html: _html, ...topic }) => topic) };
};
