// LINKMUSICIAN: inventaire filtrable (DIAGRAM-02). Filtres dans l'URL (lien
// partageable), appliqués côté serveur : seule la page demandée est rendue.
import { requireDiagramReader } from '#server/diagram/access';
import { ACTORS, DOMAINS, PROCESSES, STATUS_LABELS } from '#server/diagram/catalog';
import { ROOT_CRUMB, actorLabels, domainLabels, processRow } from '#server/diagram/views';
import { DELIVERY_STATUSES, type DeliveryStatus } from '#lib/diagram/types';
import { normalizeQuery } from '#lib/diagram/ui';
import type { PageServerLoad } from './$types';

const PAGE = 100;

export const load: PageServerLoad = async ({ locals, url }) => {
	requireDiagramReader(locals);
	const get = (k: string) => url.searchParams.get(k)?.trim() || '';
	const filters = {
		domaine: get('domaine'),
		acteur: get('acteur'),
		statut: get('statut'),
		declencheur: get('declencheur'),
		decision: get('decision'),
		issue: get('issue'),
		entite: get('entite'),
		documente: get('documente'),
		q: get('q')
	};
	const q = normalizeQuery(filters.q);
	let rows = PROCESSES.filter(
		(p) =>
			(!filters.domaine || p.domain === filters.domaine) &&
			(!filters.acteur || p.actors.includes(filters.acteur)) &&
			(!filters.statut || p.status === filters.statut) &&
			(!filters.declencheur || p.trigger.kind === filters.declencheur) &&
			(!filters.decision || p.references.decisions.includes(filters.decision)) &&
			(!filters.issue || p.references.issues.includes(Number(filters.issue))) &&
			(!filters.entite || p.entities.includes(filters.entite)) &&
			(!q || normalizeQuery(`${p.title} ${p.id} ${p.services.join(' ')}`).includes(q))
	).map(processRow);
	if (filters.documente === 'oui') rows = rows.filter((r) => r.documented);
	if (filters.documente === 'non') rows = rows.filter((r) => !r.documented);
	const pageNo = Math.max(1, Number(url.searchParams.get('page')) || 1);
	return {
		filters,
		total: rows.length,
		page: pageNo,
		pages: Math.max(1, Math.ceil(rows.length / PAGE)),
		rows: rows.slice((pageNo - 1) * PAGE, pageNo * PAGE),
		options: {
			domains: DOMAINS.map((d) => ({ value: d.id, label: d.label })),
			actors: ACTORS.map((a) => ({ value: a.id, label: a.label })),
			statuses: DELIVERY_STATUSES.map((s: DeliveryStatus) => ({
				value: s,
				label: STATUS_LABELS[s]
			}))
		},
		actors: actorLabels(),
		domains: domainLabels(),
		crumbs: [ROOT_CRUMB, { label: 'Inventaire', href: '/diagram/inventaire' }]
	};
};
