// LINKMUSICIAN: export SVG d'un diagramme (DIAGRAM-03). SVG reconstruit
// (`toSvg` : liste blanche, texte échappé) ; servi en pièce jointe, avec une
// CSP qui interdit tout script même si le fichier était ouvert seul.
import { error } from '@sveltejs/kit';
import { PRIVATE_HEADERS, requireDiagramReader } from '#server/diagram/access';
import { diagramBySlug } from '#server/diagram/catalog';
import { models } from '#server/diagram/sources';
import { toSvg } from '#server/diagram/svg';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	requireDiagramReader(locals);
	const def = diagramBySlug.get(params.slug);
	if (!def) error(404, 'Diagramme introuvable');
	const model = (await models([def.id])).get(def.id);
	if (!model || model instanceof Error) error(500, 'Source du diagramme illisible');
	return new Response(toSvg(model, { title: def.title, description: def.description }), {
		headers: {
			...PRIVATE_HEADERS,
			'content-type': 'image/svg+xml; charset=utf-8',
			'content-disposition': `attachment; filename="${def.slug}.svg"`,
			'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
			'x-content-type-options': 'nosniff'
		}
	});
};
