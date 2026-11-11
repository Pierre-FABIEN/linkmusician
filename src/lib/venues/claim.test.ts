import { describe, expect, it } from 'vitest';
import {
	CLAIM_CODE_ALPHABET,
	claimBlocker,
	claimCode,
	displayedCode,
	proofUrlSchema
} from './claim';

describe('code de revendication (P5-03a)', () => {
	it('8 caractères sans ambiguïté, préfixés à l’affichage', () => {
		const code = claimCode();
		expect(code).toMatch(new RegExp(`^[${CLAIM_CODE_ALPHABET}]{8}$`));
		expect(code).not.toMatch(/[01OIL]/);
		expect(claimCode(() => 0)).toBe('AAAAAAAA');
		expect(claimCode(() => 0.9999)).toBe('99999999');
		expect(displayedCode('ABCD2345')).toBe('LM-ABCD2345');
	});

	it('lien de preuve : https complet seulement', () => {
		expect(proofUrlSchema.safeParse('https://www.instagram.com/lecomptoir').success).toBe(true);
		expect(proofUrlSchema.safeParse('http://lecomptoir.fr').success).toBe(false);
		expect(proofUrlSchema.safeParse('instagram').success).toBe(false);
	});
});

describe('claimBlocker', () => {
	const ok = { adult: true, validated: true, claimed: false, recentClaims: 0, managedVenues: 0 };
	it.each([
		['possible', {}, null],
		['mineur·e', { adult: false }, /majeur/],
		['déjà géré', { claimed: true }, /déjà géré/],
		['pas confirmé', { validated: false }, /confirmé/],
		['trois lieux', { managedVenues: 3 }, /3 lieux/],
		['trop de demandes', { recentClaims: 3 }, /Trois revendications/]
	])('%s', (_, patch, expected) => {
		const r = claimBlocker({ ...ok, ...patch });
		if (expected === null) expect(r).toBeNull();
		else expect(r).toMatch(expected);
	});
});
