/**
 * LINKMUSICIAN: sources `.drawio` et données vérifiées, côté serveur
 * (DIAGRAM-02, DIAGRAM-03).
 *
 * `import.meta.glob` paresseux : une source n'est chargée qu'à l'ouverture
 * de son diagramme, puis gardée en mémoire. Les fichiers vivent sous
 * `docs/`, jamais sous `static/` : rien n'est servi sans passer par la garde.
 */
import {
	buildSearchIndex,
	diagramById,
	loadModels,
	type ReferenceData,
	type SearchEntry
} from './catalog';
import references from './generated/references.json';
import type { DrawioModel } from '#lib/diagram/types';

const files = import.meta.glob<string>('/docs/diagram/drawio/**/*.drawio', {
	query: '?raw',
	import: 'default'
});

export const referenceData = references as ReferenceData;

export async function readSource(path: string): Promise<string | null> {
	const loader = files[`/${path}`];
	return loader ? loader() : null;
}

const cache = new Map<string, DrawioModel | Error>();

/** Modèles des diagrammes demandés, lus une fois par processus serveur. */
export async function models(ids: string[]): Promise<Map<string, DrawioModel | Error>> {
	const missing = ids.filter((id) => !cache.has(id) && diagramById.has(id));
	if (missing.length > 0) {
		for (const [id, model] of await loadModels(missing, readSource)) cache.set(id, model);
	}
	return new Map(ids.filter((id) => cache.has(id)).map((id) => [id, cache.get(id)!]));
}

let index: SearchEntry[] | null = null;

/** Index de recherche précalculé à la première recherche. */
export function searchIndex() {
	index ??= buildSearchIndex(referenceData.decisions);
	return index;
}
