import { describe, expect, it } from 'vitest';
import { establishmentBlocker, requestBlocker, verificationSchema } from './verification';

describe('verificationSchema', () => {
	it('SIRET valide (Luhn) et lien https', () => {
		const ok = verificationSchema.safeParse({
			siret: '732 829 320 00074',
			officialUrl: 'https://www.instagram.com/lesratsdumardi'
		});
		expect(ok.success && ok.data.siret).toBe('73282932000074');
	});
	it.each([
		['SIRET faux', { siret: '12345678901234', officialUrl: 'https://groupe.fr' }, /SIRET/],
		['lien en http', { siret: '73282932000074', officialUrl: 'http://groupe.fr' }, /https/],
		['pas un lien', { siret: '73282932000074', officialUrl: 'groupe' }, /https/]
	])('%s', (_, input, message) => {
		const r = verificationSchema.safeParse(input);
		expect(r.success).toBe(false);
		if (!r.success) expect(r.error.issues[0].message).toMatch(message);
	});
});

describe('requestBlocker', () => {
	const ok = {
		isManager: true,
		verified: false,
		dissolved: false,
		pending: false,
		recentRequests: 0
	};
	it.each([
		['demande possible', {}, null],
		['pas la gestion', { isManager: false }, /gèrent/],
		['déjà vérifié', { verified: true }, /déjà vérifié/],
		['dissoute', { dissolved: true }, /dissoute/],
		['en attente', { pending: true }, /en cours/],
		['trop de demandes', { recentRequests: 3 }, /Trois demandes/]
	])('%s', (_, patch, expected) => {
		const r = requestBlocker({ ...ok, ...patch });
		if (expected === null) expect(r).toBeNull();
		else expect(r).toMatch(expected);
	});
});

describe('establishmentBlocker (P5-02)', () => {
	it('refuse un SIRET inconnu ou fermé, accepte un établissement actif', () => {
		expect(establishmentBlocker(null)).toMatch(/introuvable/);
		expect(establishmentBlocker({ active: false })).toMatch(/fermé/);
		expect(establishmentBlocker({ active: true })).toBeNull();
	});
});
