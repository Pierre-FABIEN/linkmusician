// LINKMUSICIAN: sujets et recherche dérivés du contenu, sans catalogue à maintenir en double.
import { HELP_PAGES, helpHref } from '#lib/aide/catalog';
import { renderedHelpPage } from './render';

function plain(html: string): string {
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/\s+/g, ' ')
		.trim();
}

export function helpTopics() {
	return HELP_PAGES.filter((page) => page.slug).flatMap((page) => {
		const help = renderedHelpPage(page.file)!;
		return help.toc.map((section, index) => {
			const start = help.html.indexOf(`<h2 id="${section.id}">`);
			const next = help.toc[index + 1];
			const end = next ? help.html.indexOf(`<h2 id="${next.id}">`) : help.html.length;
			const html = help.html.slice(start, end);
			const body = html.replace(/^<h2[^>]*>[\s\S]*?<\/h2>\s*/, '');
			const text = plain(body);
			return {
				id: section.id,
				title: section.text.replace(/^\d+\.\s*/, ''),
				category: page.nav,
				slug: page.slug,
				href: `${helpHref(page)}/${section.id}`,
				text,
				excerpt: text.length > 150 ? `${text.slice(0, 147)}…` : text,
				// Les ancres locales peuvent viser une autre section du guide complet.
				html: body.replace(/href="#/g, `href="${helpHref(page)}#`)
			};
		});
	});
}
