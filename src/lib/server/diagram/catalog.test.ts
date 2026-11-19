import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	ACTORS,
	DIAGRAMS,
	DOMAINS,
	PROCESSES,
	buildSearchIndex,
	checkModel,
	diagramsLinkingTo,
	menu,
	readingOrder,
	search,
	usesOfEntity,
	variants
} from './catalog';
import { parseDrawio } from './drawio';
import { actorById, domainById } from './taxonomy';
import { DELIVERY_STATUSES, DIAGRAM_KINDS } from './types';

const unique = (values: string[]) => new Set(values).size === values.length;

describe('identifiants', () => {
	it('processus, diagrammes, slugs et étapes sont uniques', () => {
		expect(unique(PROCESSES.map((p) => p.id))).toBe(true);
		expect(unique(DIAGRAMS.map((d) => d.id))).toBe(true);
		expect(unique(DIAGRAMS.map((d) => d.slug))).toBe(true);
		for (const d of DIAGRAMS) expect(unique(d.steps.map((s) => s.id)), d.id).toBe(true);
		expect(unique(ACTORS.map((a) => a.id))).toBe(true);
		expect(unique(DOMAINS.map((d) => d.id))).toBe(true);
	});

	it('un slug ne contient que des caractères sûrs pour une URL', () => {
		for (const d of DIAGRAMS) expect(d.slug).toMatch(/^[a-z0-9-]+$/);
	});
});

describe('taxonomie', () => {
	it('chaque processus vise un domaine et des acteurs connus', () => {
		for (const p of PROCESSES) {
			expect(domainById.has(p.domain), `${p.id} → ${p.domain}`).toBe(true);
			for (const a of p.actors) expect(actorById.has(a), `${p.id} → ${a}`).toBe(true);
			expect(DELIVERY_STATUSES).toContain(p.status);
		}
	});

	it('chaque diagramme vise un domaine, un type et des acteurs connus', () => {
		for (const d of DIAGRAMS) {
			expect(domainById.has(d.domain), d.id).toBe(true);
			expect(DIAGRAM_KINDS).toContain(d.kind);
			for (const a of [...d.actors, ...d.steps.map((s) => s.actor)]) {
				expect(actorById.has(a), `${d.id} → ${a}`).toBe(true);
			}
		}
	});
});

describe('liens', () => {
	it('next et alternatives pointent vers une étape du même diagramme', () => {
		for (const d of DIAGRAMS) {
			const ids = new Set(d.steps.map((s) => s.id));
			for (const s of d.steps) {
				for (const t of [...s.next, ...s.alternatives])
					expect(ids.has(t), `${d.id}#${s.id} → ${t}`).toBe(true);
			}
		}
	});

	it('parents, enfants et diagrammes liés existent et sont réciproques', () => {
		const ids = new Set(DIAGRAMS.map((d) => d.id));
		for (const d of DIAGRAMS) {
			for (const r of [...d.parents, ...d.children, ...d.related])
				expect(ids.has(r), `${d.id} → ${r}`).toBe(true);
			for (const c of d.children) expect(DIAGRAMS.find((x) => x.id === c)!.parents).toContain(d.id);
		}
	});

	it('un nœud qui ouvre un diagramme ou un domaine vise une cible existante', () => {
		for (const d of DIAGRAMS) {
			for (const s of d.steps) {
				if (s.goto?.diagram)
					expect(
						DIAGRAMS.some((x) => x.id === s.goto!.diagram),
						s.id
					).toBe(true);
				if (s.goto?.domain) expect(domainById.has(s.goto.domain), s.id).toBe(true);
			}
		}
	});

	it('navigation inverse : le parcours de référence est cité par ses sous-diagrammes', () => {
		expect(diagramsLinkingTo('parcours-groupe-ep').map((d) => d.id)).toEqual(
			expect.arrayContaining(['etats-besoin', 'dataflow-besoin-ajouter', 'global-carte'])
		);
	});
});

describe('statuts', () => {
	it('« testé » exige une référence de test (processus, diagramme, étape)', () => {
		for (const p of PROCESSES)
			if (p.status === 'TESTED') expect(p.references.tests.length, p.id).toBeGreaterThan(0);
		for (const d of DIAGRAMS) {
			if (d.status === 'TESTED') expect(d.references.tests.length, d.id).toBeGreaterThan(0);
			for (const s of d.steps) {
				if (s.status === 'TESTED')
					expect(s.references.tests.length, `${d.id}#${s.id}`).toBeGreaterThan(0);
			}
		}
	});

	it('un processus sans code n’est jamais dit implémenté', () => {
		for (const p of PROCESSES.filter((x) => x.trigger.kind === 'none')) {
			expect(['DESIGNED', 'PLANNED', 'DEPRECATED']).toContain(p.status);
		}
	});

	it('une étape hérite du statut de son processus', () => {
		for (const d of DIAGRAMS) {
			for (const s of d.steps.filter((x) => x.process)) {
				expect(s.status).toBe(PROCESSES.find((p) => p.id === s.process)!.status);
			}
		}
	});
});

describe('sources .drawio', () => {
	it.each(DIAGRAMS.map((d) => [d.id, d] as const))(
		'%s : nœuds et arêtes = étapes du catalogue',
		(_, d) => {
			const model = parseDrawio(readFileSync(d.source, 'utf8'));
			expect(checkModel(d, model)).toEqual([]);
			expect(model.width).toBeGreaterThan(0);
		}
	);
});

describe('recherche', () => {
	const index = buildSearchIndex();
	const ids = (q: string, filters = {}) =>
		search(index, q, filters).results.map((r) => `${r.type}:${r.id}`);

	it.each([
		['inviter musicien', 'process:groupes-handle.invite'],
		['projectNeed', 'entity:ProjectNeed'],
		['concert confirmé', 'process:messages-id.confirmCollab'],
		['XP collaboration', 'process:messages-id.confirmCollab'],
		['booker candidature', 'process:annonces-id.applyDelegated'],
		['retrait coordination', 'process:projets-id.revoquer'],
		['D76', 'decision:D76'],
		['#71', 'diagram:parcours-groupe-ep']
	])('« %s » trouve %s', (q, expected) => {
		expect(ids(q)).toContain(expected);
	});

	it('trouve un terme présent seulement dans une étape', () => {
		expect(ids('project-need-author')).toContain('step:dataflow-besoin-ajouter#df-lock-author');
	});

	it('le titre l’emporte sur le corps', () => {
		expect(search(index, 'Cycle de vie besoin').results[0].id).toBe('etats-besoin');
	});

	it('filtres combinables : domaine, acteur, statut, type', () => {
		const besoins = search(index, '', { domain: 'besoins', type: 'process' }, 500);
		expect(besoins.total).toBeGreaterThan(5);
		expect(besoins.results.every((r) => r.domain === 'besoins')).toBe(true);
		const planned = search(index, '', { status: 'DESIGNED' }, 500).results;
		expect(planned.length).toBeGreaterThan(0);
		expect(planned.every((r) => r.status === 'DESIGNED')).toBe(true);
		const booker = search(index, '', { actor: 'booker' }, 500).results;
		expect(booker.every((r) => r.actors.includes('booker'))).toBe(true);
		expect(search(index, '', { kind: 'etats' }, 500).results.every((r) => r.kind === 'etats')).toBe(
			true
		);
	});

	it('variantes : racine et équivalences métier', () => {
		expect(variants('retrait')).toEqual(expect.arrayContaining(['retir', 'revoqu']));
		expect(variants('invitations')).toContain('invita');
	});
});

describe('menu et index inverses', () => {
	it('chaque groupe compte ses diagrammes, et le menu couvre domaines, métiers et vues', () => {
		const sections = menu();
		for (const g of sections.flatMap((s) => s.groups)) {
			if (g.children.length > 0) expect(g.count).toBe(g.children.length);
		}
		const domainGroups = sections.find((s) => s.id === 'domaines')!.groups;
		expect(domainGroups).toHaveLength(DOMAINS.length);
		expect(sections.find((s) => s.id === 'metiers')!.groups.map((g) => g.id)).toContain(
			'acteur-booker'
		);
	});

	it('depuis ProjectNeed : tous les processus et diagrammes qui l’utilisent', () => {
		const u = usesOfEntity('ProjectNeed');
		expect(u.processes.map((p) => p.id)).toEqual(
			expect.arrayContaining([
				'projets-id.besoin-ajouter',
				'projets-id.besoin-pourvu',
				'annonces-nouvelle.default'
			])
		);
		expect(u.diagrams.map((d) => d.id)).toEqual(
			expect.arrayContaining(['etats-besoin', 'donnees-projets'])
		);
		expect(u.steps.length).toBeGreaterThan(3);
	});

	it('l’ordre de lecture couvre toutes les étapes, une seule fois', () => {
		for (const d of DIAGRAMS) {
			const order = readingOrder(d).map((s) => s.id);
			expect(new Set(order).size).toBe(d.steps.length);
		}
	});
});
