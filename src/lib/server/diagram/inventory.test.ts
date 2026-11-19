import { describe, expect, it } from 'vitest';
import { PROCESSES, outOfScope } from './inventory';
import { routeSlug } from './inventory/define';
import { computeReferences, staleInventory } from './report';
import { actionNames, decisions, httpMethods, serviceExists, splitService } from './scan';

describe('lecture du code', () => {
	it('clés d’actions : identifiants, chaînes, raccourcis, `satisfies`', () => {
		const source = `
			import { answerForm } from './x';
			export const actions = {
				default: async () => {},
				'besoin-ajouter': async () => {},
				repondre: answerForm,
				answerForm,
				save() {}
			} satisfies Actions;
			const actionsLocales = { pasCelleCi: 1 };`;
		expect(actionNames(source)).toEqual([
			'default',
			'besoin-ajouter',
			'repondre',
			'answerForm',
			'save'
		]);
	});

	it('une action citée dans un commentaire ou une autre constante n’est pas comptée', () => {
		expect(
			actionNames('// export const actions = { faux: 1 }\nconst actions = { cache: 1 };')
		).toEqual([]);
	});

	it('méthodes HTTP exportées, en fonction ou en constante', () => {
		const source = `export const GET = () => {};\nexport async function POST() {}\nexport const prerender = true;\nfunction PUT() {}`;
		expect(httpMethods(source)).toEqual(['GET', 'POST']);
	});

	it('un service se découpe en module et fonction', () => {
		expect(splitService('server/projects/needs.addNeed')).toEqual([
			'server/projects/needs',
			'addNeed'
		]);
		expect(splitService('server/onboarding-assistant')).toEqual([
			'server/onboarding-assistant',
			null
		]);
		expect(serviceExists('server/projects/needs.addNeed')).toBe(true);
		expect(serviceExists('server/projects/needs.inventee')).toBe(false);
	});

	it('le registre des décisions donne le statut qui ouvre la cellule', () => {
		const registry = decisions();
		expect(registry.D76.status).toBe('ACCEPTED');
		expect(registry.D78.status).toBe('PROPOSED');
		expect(registry.D64.status).toBe('ACCEPTED');
	});
});

describe('inventaire exhaustif du code', () => {
	const data = computeReferences();

	it('chaque action et chaque endpoint du périmètre est inventorié', () => {
		expect(data.code.missing).toEqual([]);
		expect(data.code.triggers).toBeGreaterThan(300);
	});

	it('aucun processus inventorié ne désigne un déclencheur disparu', () => {
		expect(staleInventory()).toEqual([]);
	});

	it('le périmètre écarté est justifié et ne cache aucune route de l’espace', () => {
		expect(outOfScope('/(app)/projets/[id]')).toBeNull();
		expect(outOfScope('/checkout/paiement')?.reason).toMatch(/D6/);
	});

	it('toutes les références existent : fichiers, services, entités, décisions', () => {
		expect(Object.entries(data.files).filter(([, ok]) => !ok)).toEqual([]);
		expect(Object.entries(data.services).filter(([, ok]) => !ok)).toEqual([]);
		const models = new Set(data.models);
		for (const p of PROCESSES) {
			for (const e of p.entities) expect(models.has(e), `${p.id} → ${e}`).toBe(true);
			for (const d of p.references.decisions)
				expect(data.decisions[d], `${p.id} → ${d}`).toBeDefined();
		}
	});

	it('identifiants de processus stables et lisibles', () => {
		expect(routeSlug('/(app)/projets/[id]')).toBe('projets-id');
		expect(routeSlug('/@[handle]')).toBe('handle');
		expect(routeSlug('/api/carriere/souvenir/[handle]/[act].png')).toBe(
			'api-carriere-souvenir-handle-act'
		);
		for (const p of PROCESSES) expect(p.id).toMatch(/^[a-z0-9-]+\.[a-zA-Z0-9_-]+$/);
	});
});
