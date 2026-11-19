// LINKMUSICIAN: suggestions de la recherche globale (DIAGRAM-02). Garde
// rappelée : un endpoint ne passe pas par le `load` du layout.
import { json } from '@sveltejs/kit';
import { PRIVATE_HEADERS, requireDiagramReader } from '#server/diagram/access';
import { search } from '#server/diagram/catalog';
import { searchIndex } from '#server/diagram/sources';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	requireDiagramReader(locals);
	const q = (url.searchParams.get('q') ?? '').slice(0, 120);
	const { total, results } = search(searchIndex(), q, {}, 12);
	return json(
		{
			total,
			results: results.map(({ type, id, title, href, context }) => ({
				type,
				id,
				title,
				href,
				context
			}))
		},
		{ headers: PRIVATE_HEADERS }
	);
};
