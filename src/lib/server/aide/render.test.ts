import { describe, expect, it } from 'vitest';
import { HELP_PAGES, helpHref, neighbours } from '#lib/aide/catalog';
import { renderHelp, renderedHelpPage, rewriteHref, slugify } from './render';

const rendered = HELP_PAGES.map((page) => ({ page, help: renderedHelpPage(page.file)! }));

describe('centre d’aide : les pages', () => {
	it('chaque page du catalogue a son fichier', () => {
		for (const { page, help } of rendered) expect(help, page.file).not.toBeNull();
	});

	it('chaque page a un titre, une accroche et un encart « En bref »', () => {
		for (const { page, help } of rendered) {
			expect(help.title, page.file).not.toBe('Aide');
			expect(help.lead, page.file).toBeTruthy();
			expect(help.html, page.file).toContain('aide-brief');
		}
	});

	it('aucun lien vers un fichier .md ne reste, chaque lien interne mène à une page et une ancre qui existent', () => {
		const ids = new Map(
			rendered.map(({ page, help }) => [
				helpHref(page),
				new Set([...help.html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]))
			])
		);
		for (const { page, help } of rendered) {
			expect(help.html, page.file).not.toMatch(/href="[^"]*\.md/);
			for (const [, href] of help.html.matchAll(/href="(\/aide[^"]*)"/g)) {
				const [path, anchor] = href.split('#');
				expect(ids.has(path), `${page.file} → ${href}`).toBe(true);
				if (anchor) expect(ids.get(path)!.has(anchor), `${page.file} → ${href}`).toBe(true);
			}
		}
	});

	it('le bloc de navigation final est retiré (la page dessine le sien)', () => {
		for (const { page, help } of rendered) expect(help.html, page.file).not.toContain('<hr>');
	});

	it('les pages des deux modes ont un sommaire', () => {
		const jam = rendered.find((r) => r.page.slug === 'mode-jam')!.help;
		const career = rendered.find((r) => r.page.slug === 'mode-carriere')!.help;
		expect(jam.toc.map((t) => t.id)).toContain('apres-la-jam');
		expect(career.toc.map((t) => t.id)).toContain('mon-parcours');
	});

	it('précédente et suivante suivent l’ordre de lecture', () => {
		expect(neighbours('').previous).toBeNull();
		expect(neighbours('mode-jam').previous?.slug).toBe('premiers-pas');
		expect(neighbours('mode-jam').next?.slug).toBe('mode-carriere');
		expect(neighbours('securite').next).toBeNull();
	});
});

describe('centre d’aide : le rendu', () => {
	it('réécrit les liens entre pages', () => {
		expect(rewriteHref('./02-mode-jam.md')).toBe('/aide/mode-jam');
		expect(rewriteHref('./03-mode-carriere.md#paliers')).toBe('/aide/mode-carriere#paliers');
		expect(rewriteHref('./00-accueil.md')).toBe('/aide');
		expect(rewriteHref('/jouer')).toBe('/jouer');
	});

	it('transforme les encarts et garde les ancres choisies', () => {
		const help = renderHelp(
			'# Titre\n\n_Accroche._\n\n> **En bref**\n>\n> - un\n\n## Avant {#avant}\n\n> 💡 **Astuce** : oui.\n\n> ⚠️ **Important** : non.\n\n| a | b |\n| - | - |\n| 1 | 2 |\n'
		);
		expect(help.title).toBe('Titre');
		expect(help.lead).toBe('Accroche.');
		expect(help.html).toContain('<aside class="aide-callout aide-brief" aria-label="En bref">');
		expect(help.html).toContain('<h2 id="avant">Avant</h2>');
		expect(help.html).toContain('aide-tip');
		expect(help.html).toContain('aide-warning');
		expect(help.html).toContain('<div class="aide-table" role="region" tabindex="0"');
		expect(help.toc).toEqual([{ id: 'avant', text: 'Avant' }]);
	});

	it('dérive une ancre lisible d’un titre', () => {
		expect(slugify('3. Après la jam')).toBe('3-apres-la-jam');
		expect(slugify('Pour les mineur·es')).toBe('pour-les-mineur-es');
	});
});

describe('feuille de route de la startup (/admin/lancement)', () => {
	it('se rend avec ses six phases, ses encarts et ses principes', async () => {
		const { renderedLaunchRoadmap } = await import('./render');
		const roadmap = renderedLaunchRoadmap();
		expect(roadmap.title).toBe('LinkMusician, de l’idée à la startup');
		expect(roadmap.toc.map((t) => t.id)).toEqual([
			'etat',
			'phase-1',
			'phase-2',
			'phase-3',
			'phase-4',
			'phase-5',
			'phase-6',
			'principes',
			'vision'
		]);
		expect(roadmap.html).toContain('aide-brief');
		expect(roadmap.html.match(/aide-project/g)?.length).toBeGreaterThanOrEqual(10);
		expect(roadmap.html).not.toMatch(/href="[^"]*\.md/);
	});
});
