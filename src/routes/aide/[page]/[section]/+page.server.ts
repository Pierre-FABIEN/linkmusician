// LINKMUSICIAN: une réponse à la fois, avec les adresses historiques conservées.
import { error } from '@sveltejs/kit';
import { helpPage } from '#lib/aide/catalog';
import { helpTopics } from '#lib/server/aide/directory';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const category = helpPage(params.page);
	const topic = helpTopics().find(
		(item) => item.slug === params.page && item.id === params.section
	);
	if (!category || !topic) error(404, 'Sujet d’aide introuvable');
	return {
		page: { ...category, slug: `${params.page}/${params.section}`, summary: topic.excerpt },
		help: { title: topic.title, lead: null, html: topic.html, toc: [] },
		category
	};
};
