/**
 * LINKMUSICIAN: données des pages de Melokiva Diagram (DIAGRAM-02, DIAGRAM-03).
 *
 * Chaque fonction rend un objet sérialisable, limité à ce que la page
 * affiche ; aucune ne lit la base. Les routes appellent la garde avant.
 */
import { error } from '@sveltejs/kit';
import {
	ACTORS,
	DIAGRAMS,
	DOMAINS,
	KIND_LABELS,
	PROCESSES,
	STATUS_LABELS,
	diagramById,
	diagramBySlug,
	diagramsLinkingTo,
	diagramsOfActor,
	diagramsOfDomain,
	processesOfActor,
	processesOfDomain,
	readingOrder,
	stepsOfProcess,
	usesOfEntity,
	type ViewId
} from './catalog';
import { processById } from './inventory';
import { actorById, domainById } from './taxonomy';
import type { DiagramDefinition, ProcessEntry } from '#lib/diagram/types';
import { models } from './sources';

export const ROOT_CRUMB = { label: 'Vue globale', href: '/diagram' };

export const actorLabels = () => Object.fromEntries(ACTORS.map((a) => [a.id, a.label]));
export const domainLabels = () => Object.fromEntries(DOMAINS.map((d) => [d.id, d.label]));

export function triggerText(p: ProcessEntry) {
	const t = p.trigger;
	if (t.kind === 'action') return `POST ${t.route} ?/${t.name}`;
	if (t.kind === 'endpoint' || t.kind === 'job') return `${t.method} ${t.route}`;
	if (t.kind === 'load') return `load ${t.route}`;
	return 'Documentation seulement (aucun code)';
}

/** Résumé d'un diagramme pour une liste. */
export const diagramCard = (d: DiagramDefinition) => ({
	id: d.id,
	slug: d.slug,
	title: d.title,
	description: d.description,
	kind: d.kind,
	kindLabel: KIND_LABELS[d.kind],
	status: d.status,
	steps: d.steps.length,
	domain: d.domain
});

/** Résumé d'un processus pour une liste. */
export const processRow = (p: ProcessEntry) => ({
	id: p.id,
	title: p.title,
	domain: p.domain,
	actors: p.actors,
	status: p.status,
	trigger: triggerText(p),
	entities: p.entities,
	documented: stepsOfProcess(p.id).length > 0
});

const refCards = (ids: string[]) =>
	ids
		.map((id) => diagramById.get(id))
		.filter((d): d is DiagramDefinition => Boolean(d))
		.map(diagramCard);

/** Page d'un diagramme : définition, modèle `.drawio`, liens et processus cités. */
export async function diagramPage(slug: string) {
	const def = diagramBySlug.get(slug);
	if (!def) error(404, 'Diagramme introuvable');
	const model = (await models([def.id])).get(def.id);
	const processes = Object.fromEntries(
		def.steps
			.map((s) => (s.process ? processById.get(s.process) : undefined))
			.filter((p): p is ProcessEntry => Boolean(p))
			.map((p) => [p.id, { id: p.id, title: p.title, trigger: triggerText(p) }])
	);
	const gotos = Object.fromEntries(
		def.steps
			.filter((s) => s.goto)
			.map((s) => {
				const target = s.goto!.diagram ? diagramById.get(s.goto!.diagram) : undefined;
				const domain = s.goto!.domain ? domainById.get(s.goto!.domain) : undefined;
				return [
					s.id,
					target
						? { href: `/diagram/d/${target.slug}`, label: `Ouvrir « ${target.title} »` }
						: domain
							? { href: `/diagram/domaines/${domain.id}`, label: `Domaine ${domain.label}` }
							: null
				];
			})
	);
	const parent = def.parents.map((id) => diagramById.get(id)).find(Boolean);
	return {
		diagram: { ...def, kindLabel: KIND_LABELS[def.kind], statusLabel: STATUS_LABELS[def.status] },
		model: model && !(model instanceof Error) ? model : null,
		modelError: model instanceof Error ? model.message : model ? null : 'Source absente',
		order: readingOrder(def).map((s) => s.id),
		actors: actorLabels(),
		domainLabel: domainById.get(def.domain)?.label ?? def.domain,
		processes,
		gotos,
		parents: refCards(def.parents),
		children: refCards(def.children),
		related: refCards(def.related),
		citedBy: diagramsLinkingTo(def.id)
			.filter(
				(d) =>
					!def.parents.includes(d.id) && !def.children.includes(d.id) && !def.related.includes(d.id)
			)
			.map(diagramCard),
		crumbs: [
			ROOT_CRUMB,
			...(parent && parent.kind !== 'carte'
				? [{ label: parent.title, href: `/diagram/d/${parent.slug}` }]
				: [
						{
							label: domainById.get(def.domain)?.label ?? def.domain,
							href: `/diagram/domaines/${def.domain}`
						}
					]),
			{ label: def.title, href: `/diagram/d/${def.slug}` }
		]
	};
}

/** Page d'un processus : inventaire, diagrammes qui le documentent, voisins par entité. */
export function processPage(id: string) {
	const p = processById.get(id);
	if (!p) error(404, 'Processus introuvable');
	const steps = stepsOfProcess(id).map(({ diagram, step }) => ({
		diagram: diagramCard(diagram),
		step: { id: step.id, title: step.title }
	}));
	const neighbours = PROCESSES.filter(
		(o) => o.id !== p.id && o.entities.some((e) => p.entities.includes(e))
	)
		.slice(0, 40)
		.map(processRow);
	const domain = domainById.get(p.domain);
	return {
		process: { ...p, triggerText: triggerText(p), statusLabel: STATUS_LABELS[p.status] },
		steps,
		neighbours,
		actors: actorLabels(),
		domainLabel: domain?.label ?? p.domain,
		crumbs: [
			ROOT_CRUMB,
			{ label: domain?.label ?? p.domain, href: `/diagram/domaines/${p.domain}` },
			{ label: p.title, href: `/diagram/processus/${encodeURIComponent(p.id)}` }
		]
	};
}

export function domainPage(id: string) {
	const d = domainById.get(id);
	if (!d) error(404, 'Domaine introuvable');
	return {
		domain: d,
		diagrams: diagramsOfDomain(id).map(diagramCard),
		processes: processesOfDomain(id).map(processRow),
		actors: actorLabels(),
		crumbs: [ROOT_CRUMB, { label: d.label, href: `/diagram/domaines/${d.id}` }]
	};
}

export function actorPage(id: string) {
	const a = actorById.get(id);
	if (!a) error(404, 'Acteur introuvable');
	const processes = processesOfActor(id);
	const byDomain = DOMAINS.map((d) => ({
		id: d.id,
		label: d.label,
		processes: processes.filter((p) => p.domain === d.id).map(processRow)
	})).filter((g) => g.processes.length > 0);
	return {
		actor: a,
		diagrams: diagramsOfActor(id).map(diagramCard),
		byDomain,
		total: processes.length,
		actors: actorLabels(),
		crumbs: [ROOT_CRUMB, { label: a.label, href: `/diagram/acteurs/${a.id}` }]
	};
}

export function entityPage(name: string) {
	const u = usesOfEntity(name);
	if (u.processes.length + u.diagrams.length + u.steps.length === 0)
		error(404, 'Entité inconnue du catalogue');
	return {
		name,
		processes: u.processes.map(processRow),
		diagrams: u.diagrams.map(diagramCard),
		steps: u.steps.map(({ diagram, step }) => ({
			diagram: diagramCard(diagram),
			step: { id: step.id, title: step.title },
			reads: step.reads.includes(name),
			writes: step.writes.includes(name)
		})),
		actors: actorLabels(),
		crumbs: [
			ROOT_CRUMB,
			{ label: 'Entités', href: '/diagram/entites' },
			{ label: name, href: `/diagram/entites/${encodeURIComponent(name)}` }
		]
	};
}

/** Vues transversales du menu. */
export function viewPage(id: ViewId) {
	const kinds: Record<ViewId, string[]> = {
		parcours: ['parcours', 'couloirs'],
		dataflows: ['dataflow'],
		permissions: ['permissions'],
		donnees: ['donnees'],
		etats: ['etats'],
		evenements: [],
		evolutions: []
	};
	const diagrams = DIAGRAMS.filter((d) => kinds[id].includes(d.kind)).map(diagramCard);
	const permissions =
		id === 'permissions'
			? DIAGRAMS.flatMap((d) =>
					d.steps
						.filter((s) => s.permissions.length > 0)
						.map((s) => ({
							diagram: { slug: d.slug, title: d.title },
							step: { id: s.id, title: s.title },
							permissions: s.permissions,
							preconditions: s.preconditions,
							errors: s.errors
						}))
				)
			: [];
	const progression =
		id === 'evenements'
			? PROCESSES.filter(
					(p) =>
						p.domain === 'carriere' ||
						p.entities.some((e) =>
							['DomainEvent', 'XpTransaction', 'ActorProgress', 'ReputationSnapshot'].includes(e)
						)
				).map(processRow)
			: [];
	const evolutions =
		id === 'evolutions'
			? PROCESSES.filter((p) => p.trigger.kind === 'none').map((p) => ({
					...processRow(p),
					notes: p.notes ?? '',
					decisions: p.references.decisions,
					issues: p.references.issues,
					docs: p.references.docs
				}))
			: [];
	return { diagrams, permissions, progression, evolutions, actors: actorLabels() };
}
