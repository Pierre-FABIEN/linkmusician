/**
 * LINKMUSICIAN: aides à la déclaration de l'inventaire (DIAGRAM-01).
 *
 * Un groupe décrit une route et ses actions de formulaire ; chaque action
 * devient un `ProcessEntry`. Le statut se déduit des preuves : des tests
 * référencés (et existants, vérifiés par la synchronisation) donnent
 * `TESTED`, sinon `IMPLEMENTED`. On ne déclare jamais `TESTED` à la main.
 */
import type { DeliveryStatus, ProcessEntry, References, Trigger } from '../types';

export interface ActionOverride {
	title: string;
	domain?: string;
	actors?: string[];
	services?: string[];
	entities?: string[];
	errors?: string[];
	tests?: string[];
	decisions?: string[];
	issues?: number[];
	notes?: string;
}

export interface RouteGroup {
	/** Identifiant de route SvelteKit (`/(app)/projets/[id]`). */
	route: string;
	domain: string;
	actors: string[];
	services: string[];
	entities: string[];
	tests?: string[];
	decisions?: string[];
	issues?: number[];
	docs?: string[];
	actions: Record<string, string | ActionOverride>;
}

/** `/(app)/projets/[id]` → `projets-id` : stable, lisible, sans caractère spécial. */
export function routeSlug(route: string) {
	return (
		route
			.replace(/\([^)]*\)\//g, '')
			.replace(/[[\]@]/g, '')
			.replace(/\.png$/, '')
			.split('/')
			.filter(Boolean)
			.join('-')
			.replace(/[^a-z0-9-]/gi, '-')
			.toLowerCase() || 'racine'
	);
}

export const routeFile = (route: string, file = '+page.server.ts') =>
	`src/routes${route === '/' ? '' : route}/${file}`;

const statusOf = (tests: string[]): DeliveryStatus => (tests.length > 0 ? 'TESTED' : 'IMPLEMENTED');

export function expandGroup(group: RouteGroup): ProcessEntry[] {
	return Object.entries(group.actions).map(([name, value]) => {
		const o: ActionOverride = typeof value === 'string' ? { title: value } : value;
		const tests = o.tests ?? group.tests ?? [];
		const references: References = {
			decisions: o.decisions ?? group.decisions ?? [],
			issues: o.issues ?? group.issues ?? [],
			sourceFiles: [routeFile(group.route)],
			tests,
			docs: group.docs ?? []
		};
		const trigger: Trigger = { kind: 'action', route: group.route, name };
		return {
			id: `${routeSlug(group.route)}.${name}`,
			title: o.title,
			domain: o.domain ?? group.domain,
			actors: o.actors ?? group.actors,
			trigger,
			services: o.services ?? group.services,
			entities: o.entities ?? group.entities,
			status: statusOf(tests),
			errors: o.errors ?? [],
			references,
			provenance: 'code',
			...(o.notes ? { notes: o.notes } : {})
		};
	});
}

export interface EndpointDef {
	route: string;
	method: string;
	kind: 'endpoint' | 'job';
	title: string;
	domain: string;
	actors: string[];
	services: string[];
	entities: string[];
	tests?: string[];
	decisions?: string[];
	errors?: string[];
	notes?: string;
}

export function expandEndpoint(e: EndpointDef): ProcessEntry {
	const tests = e.tests ?? [];
	return {
		id: `${routeSlug(e.route)}.${e.method.toLowerCase()}`,
		title: e.title,
		domain: e.domain,
		actors: e.actors,
		trigger: { kind: e.kind, route: e.route, method: e.method },
		services: e.services,
		entities: e.entities,
		status: statusOf(tests),
		errors: e.errors ?? [],
		references: {
			decisions: e.decisions ?? [],
			issues: [],
			sourceFiles: [routeFile(e.route, '+server.ts')],
			tests,
			docs: []
		},
		provenance: 'code',
		...(e.notes ? { notes: e.notes } : {})
	};
}

/** Raccourci pour les specs e2e de LinkMusician. */
export const e2e = (...names: string[]) => names.map((n) => `e2e/linkmusician/${n}.spec.ts`);
export const it = (...paths: string[]) => paths.map((p) => `src/lib/server/${p}`);
