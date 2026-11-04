import { describe, expect, it } from 'vitest';
import {
	checkLink,
	isPracticeYear,
	isTravelRadius,
	normalizeBio,
	proStatusLabel,
	yearsOfPractice
} from './profile';

describe('statut pro (D17)', () => {
	it('s’affiche toujours « déclaré »', () => {
		expect(proStatusLabel('SEMI_PRO')).toBe('Semi-pro (déclaré)');
	});
});

describe('pratique et mobilité', () => {
	const today = new Date('2026-11-04');

	it('accepte une année de début plausible', () => {
		expect(isPracticeYear(2010, today)).toBe(true);
		expect(isPracticeYear(2026, today)).toBe(true);
		expect([1939, 2027, 2010.5, '2010'].some((y) => isPracticeYear(y, today))).toBe(false);
	});

	it('compte les années de pratique', () => {
		expect(yearsOfPractice(2010, today)).toBe(16);
		expect(yearsOfPractice(2026, today)).toBe(0);
	});

	it('ne propose que des tranches de rayon', () => {
		expect(isTravelRadius(25)).toBe(true);
		expect(isTravelRadius(30)).toBe(false);
	});
});

describe('normalizeBio', () => {
	it('garde les paragraphes, retire le reste', () => {
		expect(normalizeBio('  Guitariste\u0000 punk  \r\n\r\n\r\n\r\nCherche   groupe\t ')).toBe(
			'Guitariste punk\n\nCherche groupe'
		);
	});
});

describe('checkLink', () => {
	it('complète et sécurise une adresse', () => {
		expect(checkLink('SOUNDCLOUD', 'soundcloud.com/lea')).toEqual({
			ok: true,
			url: 'https://soundcloud.com/lea'
		});
		expect(checkLink('WEBSITE', 'http://lea-musique.fr/')).toEqual({
			ok: true,
			url: 'https://lea-musique.fr/'
		});
	});

	it('accepte les sous-domaines Bandcamp', () => {
		expect(checkLink('BANDCAMP', 'https://lea.bandcamp.com/album/x')).toMatchObject({ ok: true });
		expect(checkLink('BANDCAMP', 'https://evilbandcamp.com')).toEqual({
			ok: false,
			reason: 'host'
		});
	});

	it('refuse un domaine qui ne correspond pas au type', () => {
		expect(checkLink('SPOTIFY', 'https://open.spotify.com.evil.com/x')).toEqual({
			ok: false,
			reason: 'host'
		});
		expect(checkLink('INSTAGRAM', 'https://youtube.com/@lea')).toEqual({
			ok: false,
			reason: 'host'
		});
	});

	it.each([
		'javascript:alert(1)',
		'ftp://lea.fr',
		'https://user:pass@lea.fr',
		'https://127.0.0.1',
		'https://localhost',
		'pas une adresse'
	])('refuse « %s »', (value) => {
		expect(checkLink('WEBSITE', value)).toMatchObject({ ok: false });
	});

	it('borne la longueur', () => {
		expect(checkLink('WEBSITE', `lea.fr/${'a'.repeat(300)}`)).toEqual({
			ok: false,
			reason: 'too_long'
		});
	});
});
