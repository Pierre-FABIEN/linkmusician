import { describe, expect, it } from 'vitest';
import { APP_NAV, isActive } from './nav';

const item = (href: string) => APP_NAV.find((i) => i.href === href)!;

describe('navigation de l’espace', () => {
	it('cinq entrées dans l’ordre de la fiche', () => {
		expect(APP_NAV.map((i) => i.label)).toEqual([
			'Mon parcours',
			'Découvrir',
			'Annonces',
			'Messages',
			'Profil'
		]);
	});

	it.each([
		['/espace', '/espace', true],
		['/profil', '/profil/musical', true],
		['/profil', '/reglages/metiers', true],
		['/profil', '/profils', false],
		['/espace', '/profil', false]
	])('%s actif sur %s : %s', (href, path, expected) => {
		expect(isActive(item(href), path)).toBe(expected);
	});
});
