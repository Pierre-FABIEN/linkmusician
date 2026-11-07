/**
 * Centre d'aide : rendu des pages Markdown (`src/lib/aide/pages`) en HTML,
 * côté serveur, mis en cache en mémoire (le contenu ne change qu'au
 * déploiement). Le contenu vient du dépôt, jamais d'un·e utilisateur·rice.
 *
 * Conventions des fichiers (voir `docs/aide/README.md`) :
 * - `# Titre`, puis `_Accroche_` : repris dans l'en-tête de la page ;
 * - `> **En bref**`, `> 💡 **Astuce**`, `> ⚠️ **Important**`,
 *   `> 🔜 **Bientôt**` : des encarts ;
 * - `## Titre {#ancre}` : ancre stable (sinon dérivée du titre) ;
 * - liens `./02-mode-jam.md#ancre` : réécrits vers `/aide/mode-jam#ancre` ;
 * - le bloc de navigation final (après `---`) est remplacé par celui de
 *   la page.
 */
import { Marked, type Tokens } from 'marked';
import { HELP_PAGES, helpHref } from '#lib/aide/catalog';

const sources = import.meta.glob('/src/lib/aide/pages/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export type HelpCallout = 'brief' | 'tip' | 'warning' | 'soon';
export type RenderedHelp = {
	title: string;
	lead: string | null;
	html: string;
	/** Sections de niveau 2, pour le sommaire. */
	toc: { id: string; text: string }[];
};

/** Ancre lisible : minuscules, sans accents ni ponctuation. */
export function slugify(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/<[^>]+>/g, '')
		.replace(/&[a-z#0-9]+;/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

const FILE_TO_HREF = new Map(HELP_PAGES.map((p) => [p.file, helpHref(p)]));
const CUSTOM_ID = /\s*\{#([a-z0-9-]+)\}\s*$/;

/** `./02-mode-jam.md#x` → `/aide/mode-jam#x` ; le reste ne bouge pas. */
export function rewriteHref(href: string): string {
	const match = /^\.\/([\w-]+\.md)(#[\w-]+)?$/.exec(href);
	if (!match) return href;
	const target = FILE_TO_HREF.get(match[1]);
	return target ? `${target}${match[2] ?? ''}` : href;
}

function calloutOf(html: string): HelpCallout | null {
	const start = html.trimStart();
	if (start.startsWith('<p><strong>En bref</strong>')) return 'brief';
	if (start.startsWith('<p>💡')) return 'tip';
	if (start.startsWith('<p>⚠️')) return 'warning';
	if (start.startsWith('<p>🔜')) return 'soon';
	return null;
}

function escapeAttr(value: string) {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function renderHelp(markdown: string): RenderedHelp {
	let body = markdown.replace(/\r\n/g, '\n');
	const titleMatch = /^# (.+)$/m.exec(body);
	const title = titleMatch?.[1].trim() ?? 'Aide';
	if (titleMatch) body = body.replace(titleMatch[0], '');
	// Accroche : le premier paragraphe en italique, sur une ou plusieurs lignes.
	const leadMatch = /^\s*_([^_]+)_[ \t]*(?:\n|$)/.exec(body);
	const lead = leadMatch ? leadMatch[1].replace(/\s+/g, ' ').trim() : null;
	if (leadMatch) body = body.slice(leadMatch[0].length);
	// La navigation de bas de page est dessinée par la page elle-même.
	body = body.replace(/\n---\n+\[[^\n]*\]\([^\n]*\)[^\n]*\s*$/, '\n');

	const toc: RenderedHelp['toc'] = [];
	const used = new Set<string>();
	const marked = new Marked({
		gfm: true,
		renderer: {
			heading({ tokens, depth, text }: Tokens.Heading) {
				const custom = CUSTOM_ID.exec(text);
				const inline = this.parser.parseInline(tokens).replace(CUSTOM_ID, '');
				let id = custom?.[1] ?? slugify(inline);
				while (used.has(id)) id = `${id}-2`;
				used.add(id);
				if (depth === 2) toc.push({ id, text: inline.replace(/<[^>]+>/g, '') });
				return `<h${depth} id="${id}">${inline}</h${depth}>\n`;
			},
			blockquote({ tokens }: Tokens.Blockquote) {
				const inner = this.parser.parse(tokens);
				const kind = calloutOf(inner);
				if (kind === 'brief') {
					const rest = inner.replace(/^\s*<p><strong>En bref<\/strong><\/p>\s*/, '');
					return `<aside class="aide-callout aide-brief" aria-label="En bref"><p class="aide-callout-title">En bref</p>${rest}</aside>\n`;
				}
				if (kind) return `<aside class="aide-callout aide-${kind}">${inner}</aside>\n`;
				return `<blockquote>${inner}</blockquote>\n`;
			},
			link({ href, title: linkTitle, tokens }: Tokens.Link) {
				const text = this.parser.parseInline(tokens);
				const target = rewriteHref(href);
				const external = /^https?:\/\//.test(target);
				const titleAttr = linkTitle ? ` title="${escapeAttr(linkTitle)}"` : '';
				const rel = external ? ' rel="noopener noreferrer" target="_blank"' : '';
				return `<a href="${escapeAttr(target)}"${titleAttr}${rel}>${text}</a>`;
			}
		}
	});
	const html = (marked.parse(body, { async: false }) as string)
		// Tableaux : défilement horizontal sur mobile plutôt qu'une page trop large.
		.replace(/<table>/g, '<div class="aide-table"><table>')
		.replace(/<\/table>/g, '</table></div>');
	return { title, lead, html, toc };
}

const cache = new Map<string, RenderedHelp>();

/** Page rendue d'après son fichier (`02-mode-jam.md`), ou `null`. */
export function renderedHelpPage(file: string): RenderedHelp | null {
	const cached = cache.get(file);
	if (cached) return cached;
	const source = sources[`/src/lib/aide/pages/${file}`];
	if (source === undefined) return null;
	const rendered = renderHelp(source);
	cache.set(file, rendered);
	return rendered;
}
