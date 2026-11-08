import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BREADCRUMB_ROUTES, breadcrumbs, normalizeRouteId } from './breadcrumbs';

const crumbs = (
	routeId: string,
	pathname: string,
	params: Record<string, string> = {},
	data: Record<string, unknown> = {},
	preferredMode: 'JAM' | 'CAREER' | null = null
) => breadcrumbs({ routeId, pathname, params, data, preferredMode });

describe('breadcrumbs', () => {
	it('une jam remonte à « Jams à venir », avec son vrai titre', () => {
		expect(
			crumbs(
				'/(app)/jams/[id]/presents',
				'/jams/j1/presents',
				{ id: 'j1' },
				{
					jam: { title: 'Bœuf funk du mardi' }
				}
			)
		).toEqual([
			{ label: 'Mode jam', href: '/jam' },
			{ label: 'Jams à venir', href: '/jam/agenda' },
			{ label: 'Bœuf funk du mardi', href: '/jams/j1' },
			{ label: 'Qui était là ?', href: '/jams/j1/presents' }
		]);
	});

	it('sans nom dans les données : le libellé générique', () => {
		expect(crumbs('/(app)/lieux/[id]', '/lieux/v1', { id: 'v1' }).map((c) => c.label)).toEqual([
			'Mode jam',
			'Jams à venir',
			'Lieux',
			'Lieu'
		]);
	});

	it('une page de partout commence par l’accueil du mode préféré', () => {
		expect(
			crumbs(
				'/(app)/messages/[id]',
				'/messages/c1',
				{ id: 'c1' },
				{
					conversation: { other: { displayName: 'Malik' } }
				},
				'JAM'
			)
		).toEqual([
			{ label: 'Mode jam', href: '/jam' },
			{ label: 'Messages', href: '/messages' },
			{ label: 'Malik', href: '/messages/c1' }
		]);
		expect(crumbs('/(app)/profil/ville', '/profil/ville').map((c) => c.label)).toEqual([
			'Mode carrière',
			'Mon profil',
			'Ma ville'
		]);
	});

	it('le mode carrière : groupes sous l’espace', () => {
		expect(
			crumbs(
				'/(app)/groupes/[handle]/modifier',
				'/groupes/les-loups/modifier',
				{
					handle: 'les-loups'
				},
				{ band: { name: 'Les Loups' } }
			).map((c) => c.href)
		).toEqual(['/espace', '/groupes', '/groupes/les-loups', '/groupes/les-loups/modifier']);
	});

	it('la fiche de carrière remonte à l’espace', () => {
		expect(crumbs('/(app)/espace/fiche', '/espace/fiche')).toEqual([
			{ label: 'Mode carrière', href: '/espace' },
			{ label: 'Ma fiche de carrière', href: '/espace/fiche' }
		]);
	});

	it('rien à remonter sur un accueil de mode ou une page inconnue', () => {
		expect(crumbs('/(app)/jam', '/jam')).toEqual([]);
		expect(crumbs('/(app)/espace', '/espace')).toEqual([]);
		expect(crumbs('/(app)/jouer', '/jouer')).toEqual([]);
		expect(crumbs('/admin', '/admin')).toEqual([]);
		expect(
			breadcrumbs({ routeId: null, pathname: '/', params: {}, data: {}, preferredMode: null })
		).toEqual([]);
	});

	it('un nom trop long est raccourci', () => {
		const [, , last] = crumbs(
			'/(app)/annonces/[id]',
			'/annonces/a1',
			{ id: 'a1' },
			{
				opportunity: { title: 'Cherche batteuse pour un projet rock très très ambitieux' }
			}
		);
		expect([...last.label].length).toBeLessThanOrEqual(32);
		expect(last.label.endsWith('…')).toBe(true);
	});
});

describe('chaque page de l’espace a son fil d’Ariane', () => {
	const root = path.resolve('src/routes/(app)');
	const pages: string[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir)) {
			const full = path.join(dir, entry);
			if (statSync(full).isDirectory()) walk(full);
			else if (entry === '+page.svelte') {
				pages.push(normalizeRouteId('/' + path.relative(path.resolve('src/routes'), dir)));
			}
		}
	};
	walk(root);
	it.each(pages)('%s', (route) => {
		expect(BREADCRUMB_ROUTES).toContain(route);
	});
});
