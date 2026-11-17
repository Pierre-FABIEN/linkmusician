import { describe, expect, it } from 'vitest';
import { helpTopics } from './directory';
import { renderedHelpPage } from './render';
import { HELP_PAGES } from '#lib/aide/catalog';

describe('sujets du centre d’aide', () => {
	it('chaque section est accessible séparément, sans perdre de contenu', () => {
		const topics = helpTopics();
		expect(new Set(topics.map((topic) => topic.href)).size).toBe(topics.length);
		for (const page of HELP_PAGES.filter((item) => item.slug)) {
			const help = renderedHelpPage(page.file)!;
			const sections = topics.filter((topic) => topic.slug === page.slug);
			expect(sections.map((topic) => topic.id)).toEqual(help.toc.map((item) => item.id));
			for (const section of sections) {
				expect(section.title).toBeTruthy();
				expect(section.html).not.toContain('<h2');
				expect(section.html).not.toContain('href="#');
				expect(section.href).toBe(`/aide/${page.slug}/${section.id}`);
			}
		}
	});

	it('indexe le corps du texte et les réponses des questions fréquentes', () => {
		const topics = helpTopics();
		expect(
			topics.find((topic) => topic.slug === 'mode-jam' && topic.id === 'apres-la-jam')?.text
		).toBeTruthy();
		const faq = topics.find(
			(topic) => topic.slug === 'mode-jam' && topic.id === 'questions-frequentes'
		);
		expect(faq?.html).toContain('<details>');
		expect(faq?.text).not.toContain('<details>');
	});
});
