/**
 * Guide des démarches (P3-15a) : rendu des fiches Markdown
 * (`src/lib/demarches/fiches`) avec le moteur du centre d'aide (mêmes encarts,
 * mêmes ancres). L'en-tête de chaque fiche (date de vérification, sources,
 * relecture) est lu à part. Contenu du dépôt, mis en cache en mémoire.
 */
import { FICHES, parseFiche, type Fiche, type FicheMeta } from '#lib/demarches/catalog';
import { renderHelp, type RenderedHelp } from '#lib/server/aide/render';

const sources = import.meta.glob('/src/lib/demarches/fiches/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export type RenderedFiche = RenderedHelp & { meta: FicheMeta };

const cache = new Map<string, RenderedFiche>();

/** Fichier brut d'une fiche, ou `null` (pour les tests de contenu). */
export function rawFiche(file: string): string | null {
	return sources[`/src/lib/demarches/fiches/${file}`] ?? null;
}

export function renderedFiche(entry: Pick<Fiche, 'file'>): RenderedFiche | null {
	const cached = cache.get(entry.file);
	if (cached) return cached;
	const raw = rawFiche(entry.file);
	if (raw === null) return null;
	const { meta, body } = parseFiche(raw);
	const rendered = { ...renderHelp(body), meta };
	cache.set(entry.file, rendered);
	return rendered;
}

/** Fichiers présents dans le dossier mais absents du catalogue (test). */
export function orphanFiles(): string[] {
	const known = new Set(FICHES.map((f) => `/src/lib/demarches/fiches/${f.file}`));
	return Object.keys(sources).filter((path) => !known.has(path));
}
