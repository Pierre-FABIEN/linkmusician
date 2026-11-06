import { describe, expect, it } from 'vitest';
import { APP_NAV, NAV_BY_MODE, isActive, modeFor } from './nav';

const item = (href: string) => APP_NAV.find((i) => i.href === href)!;

describe('navigation de l’espace', () => {
	it('carrière : cinq entrées', () => {
		expect(NAV_BY_MODE.CAREER.map((i) => i.label)).toEqual([
			'Mon parcours',
			'Découvrir',
			'Annonces',
			'Messages',
			'Profil'
		]);
	});

	it('jam : simple, quatre entrées', () => {
		expect(NAV_BY_MODE.JAM.map((i) => i.label)).toEqual(['Jam', 'Découvrir', 'Messages', 'Profil']);
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

	it('les groupes allument l’onglet Mon parcours (P3-01)', () => {
		const career = NAV_BY_MODE.CAREER.find((i) => i.href === '/espace')!;
		expect(isActive(career, '/groupes/les-rats')).toBe(true);
	});

	it('l’annuaire des lieux allume l’onglet Jam', () => {
		const jam = NAV_BY_MODE.JAM.find((i) => i.href === '/jam')!;
		expect(isActive(jam, '/lieux/nouveau')).toBe(true);
	});

	it.each([
		['/jam', 'CAREER', 'JAM'],
		['/lieux/abc', 'CAREER', 'JAM'],
		['/lieuxdits', null, 'CAREER'],
		['/espace', 'JAM', 'CAREER'],
		['/groupes/les-rats', 'JAM', 'CAREER'],
		['/messages', 'JAM', 'JAM'],
		['/messages', null, 'CAREER']
	] as const)('mode sur %s (préférence %s) : %s', (path, preferred, mode) => {
		expect(modeFor(path, preferred)).toBe(mode);
	});
});
