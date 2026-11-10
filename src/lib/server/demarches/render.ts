/**
 * Guide des démarches (P3-15a) : rendu des fiches Markdown
 * (`src/lib/demarches/fiches`) avec le moteur du centre d'aide, mis en cache
 * en mémoire. Contenu du dépôt, jamais saisi par un·e utilisateur·rice.
 */
import { renderHelp, type RenderedHelp } from '#lib/server/aide/render';

const sources = import.meta.glob('/src/lib/demarches/fiches/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const cache = new Map<string, RenderedHelp>();

/** Fiche rendue d'après son fichier (`proteger-un-morceau.md`), ou `null`. */
export function renderedFiche(file: string): RenderedHelp | null {
	const cached = cache.get(file);
	if (cached) return cached;
	const source = sources[`/src/lib/demarches/fiches/${file}`];
	if (source === undefined) return null;
	const rendered = renderHelp(source);
	cache.set(file, rendered);
	return rendered;
}

/** Fichiers présents (pour vérifier que le catalogue n'en oublie aucun). */
export function ficheFiles(): string[] {
	return Object.keys(sources).map((p) => p.split('/').pop()!);
}
