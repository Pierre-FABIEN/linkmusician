import { describe, expect, it } from 'vitest';
import { isShopHref, isShopPath, parseShopEnabled, withoutShopLinks } from './gate';

describe('isShopPath', () => {
	it.each([
		['/products', true],
		['/products/bague-or', true],
		['/checkout', true],
		['/checkout/success', true],
		['/suivi-commande', true],
		['/cgv', true],
		['/api/save-cart', true],
		['/api/wishlist/toggle', true],
		['/', false],
		['/blog', false],
		['/contact', false],
		['/auth/login', false],
		['/admin/products', false], // admin : masqué du menu, pas bloqué
		['/api/webhooks', false], // webhooks signés : toujours ouverts
		['/api/sendcloud', false],
		['/productsfoo', false], // préfixe strict
		['/cgvx', false]
	])('%s → %s', (pathname, expected) => {
		expect(isShopPath(pathname)).toBe(expected);
	});
});

describe('isShopHref', () => {
	it('couvre aussi les entrées admin de la boutique', () => {
		expect(isShopHref('/admin/sales')).toBe(true);
		expect(isShopHref('/admin/products/reviews')).toBe(true);
		expect(isShopHref('/admin/users')).toBe(false);
	});

	it('ignore la query string et le fragment', () => {
		expect(isShopHref('/products?page=2')).toBe(true);
		expect(isShopHref('/blog#haut')).toBe(false);
	});
});

describe('parseShopEnabled', () => {
	it.each([
		[undefined, false],
		['', false],
		['  ', false],
		['true', true],
		['TRUE', true],
		['1', true],
		['on', true],
		['false', false],
		['0', false],
		['off', false]
	])('%j → %s', (value, expected) => {
		expect(parseShopEnabled(value)).toBe(expected);
	});

	it('refuse une valeur ambiguë', () => {
		expect(() => parseShopEnabled('peut-être')).toThrow(/PUBLIC_SHOP_ENABLED invalide/);
	});
});

describe('withoutShopLinks', () => {
	const links = [
		{ href: '/', label: 'Accueil' },
		{ href: '/products', label: 'Offres' },
		{ href: '/blog', label: 'Blog' },
		{ href: '/cgv', label: 'CGV' }
	];

	it('garde tout quand la boutique est active', () => {
		expect(withoutShopLinks(links, true)).toEqual(links);
	});

	it('retire les liens de boutique quand elle est coupée', () => {
		expect(withoutShopLinks(links, false).map((l) => l.label)).toEqual(['Accueil', 'Blog']);
	});

	it('accepte la forme `url` du menu admin', () => {
		const items = [
			{ title: 'ventes', url: '/admin/sales' },
			{ title: 'utilisateurs', url: '/admin/users' }
		];
		expect(withoutShopLinks(items, false).map((i) => i.title)).toEqual(['utilisateurs']);
	});
});
