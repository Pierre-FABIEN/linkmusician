import { isHttpError } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { DIAGRAMS } from './catalog';
import { models, readSource } from './sources';
import { actorPage, diagramPage, domainPage, entityPage, processPage, viewPage } from './views';

async function status(fn: () => unknown) {
	try {
		await fn();
	} catch (err) {
		return isHttpError(err) ? err.status : -1;
	}
	return 200;
}

describe('pages de Melokiva Diagram', () => {
	it('chaque diagramme se charge avec son modèle, ses liens et son ordre de lecture', async () => {
		for (const d of DIAGRAMS) {
			const page = await diagramPage(d.slug);
			expect(page.model, d.id).not.toBeNull();
			expect(page.order).toHaveLength(d.steps.length);
			expect(page.crumbs[0].href).toBe('/diagram');
		}
	});

	it('le parcours de référence ouvre ses sous-diagrammes depuis ses nœuds', async () => {
		const page = await diagramPage('parcours-groupe-ep');
		expect(page.gotos['need-add']?.href).toBe('/diagram/d/dataflow-besoin-ajouter');
		expect(page.processes['projets-id.inviter'].trigger).toBe('POST /(app)/projets/[id] ?/inviter');
		expect(page.children.map((c) => c.id)).toContain('etats-besoin');
	});

	it('identifiants inconnus : 404', async () => {
		expect(await status(() => diagramPage('inexistant'))).toBe(404);
		expect(await status(() => processPage('inexistant.x'))).toBe(404);
		expect(await status(() => domainPage('inexistant'))).toBe(404);
		expect(await status(() => actorPage('inexistant'))).toBe(404);
		expect(await status(() => entityPage('TableInventee'))).toBe(404);
	});

	it('un processus sans diagramme dit qu’il reste à construire', () => {
		const page = processPage('morceaux-id.compose');
		expect(page.steps).toEqual([]);
		expect(page.process.triggerText).toContain('?/compose');
	});

	it('navigation inverse depuis une entité et vues transversales', () => {
		expect(entityPage('ProjectNeed').processes.length).toBeGreaterThan(5);
		expect(viewPage('permissions').permissions.length).toBeGreaterThan(5);
		expect(
			viewPage('evolutions').evolutions.every((e) => e.trigger.startsWith('Documentation'))
		).toBe(true);
		expect(actorPage('booker').byDomain.length).toBeGreaterThan(0);
	});

	it('sources lues à la demande, jamais en dehors de docs/diagram/drawio', async () => {
		expect(await readSource('docs/diagram/drawio/projets/etats-besoin.drawio')).toContain(
			'<mxfile'
		);
		expect(await readSource('package.json')).toBeNull();
		expect(await readSource('docs/diagram/drawio/../../../.env')).toBeNull();
		expect((await models(['etats-besoin', 'inconnu'])).size).toBe(1);
	});
});
