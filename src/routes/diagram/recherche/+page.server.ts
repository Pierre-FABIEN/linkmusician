// LINKMUSICIAN: résultats de la recherche globale (DIAGRAM-02), filtres
// combinables par domaine, acteur, statut, type de diagramme et de résultat.
import { requireDiagramReader } from '#server/diagram/access';
import {
	ACTORS,
	DOMAINS,
	STATUS_LABELS,
	KIND_LABELS,
	search,
	type SearchType
} from '#server/diagram/catalog';
import { searchIndex } from '#server/diagram/sources';
import { ROOT_CRUMB } from '#server/diagram/views';
import {
	DELIVERY_STATUSES,
	DIAGRAM_KINDS,
	type DeliveryStatus,
	type DiagramKind
} from '#lib/diagram/types';
import type { PageServerLoad } from './$types';

const TYPES: SearchType[] = ['diagram', 'step', 'process', 'entity', 'actor', 'domain', 'decision'];

export const load: PageServerLoad = async ({ locals, url }) => {
	requireDiagramReader(locals);
	const get = (k: string) => url.searchParams.get(k)?.trim() || '';
	const q = get('q').slice(0, 120);
	const filters = {
		domain: get('domaine') || undefined,
		actor: get('acteur') || undefined,
		status: (DELIVERY_STATUSES as readonly string[]).includes(get('statut'))
			? (get('statut') as DeliveryStatus)
			: undefined,
		kind: (DIAGRAM_KINDS as readonly string[]).includes(get('type'))
			? (get('type') as DiagramKind)
			: undefined,
		type: (TYPES as string[]).includes(get('resultat'))
			? (get('resultat') as SearchType)
			: undefined
	};
	const { total, results } = search(searchIndex(), q, filters, 100);
	return {
		q,
		raw: {
			domaine: get('domaine'),
			acteur: get('acteur'),
			statut: get('statut'),
			type: get('type'),
			resultat: get('resultat')
		},
		total,
		results: results.map(({ type, id, title, href, context, status }) => ({
			type,
			id,
			title,
			href,
			context,
			status
		})),
		options: {
			domains: DOMAINS.map((d) => ({ value: d.id, label: d.label })),
			actors: ACTORS.map((a) => ({ value: a.id, label: a.label })),
			statuses: DELIVERY_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
			kinds: DIAGRAM_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))
		},
		crumbs: [
			ROOT_CRUMB,
			{ label: q ? `Recherche « ${q} »` : 'Recherche', href: '/diagram/recherche' }
		]
	};
};
