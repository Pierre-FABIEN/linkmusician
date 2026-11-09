import { describe, expect, it } from 'vitest';
import { checkReleaseReference, releaseReferenceSchema } from './verification';

describe('vérification d’une sortie externe', () => {
	it('accepte un UPC valide', () => {
		expect(checkReleaseReference('UPC', '012345678901')).toEqual({
			ok: true,
			normalized: '012345678901'
		});
	});

	it('accepte un ISRC valide', () => {
		expect(checkReleaseReference('ISRC', 'usabc1234567')).toEqual({
			ok: true,
			normalized: 'USABC1234567'
		});
	});

	it('rejette une référence trop courte ou invalide', () => {
		expect(checkReleaseReference('UPC', '123')).toMatchObject({ ok: false });
		expect(checkReleaseReference('ISRC', 'abc')).toMatchObject({ ok: false });
	});

	it('valide un objet de référence de sortie pour le formulaire', () => {
		expect(
			releaseReferenceSchema.parse({ kind: 'ISRC', value: ' usabc1234567 ' })
		).toEqual({ kind: 'ISRC', value: 'USABC1234567' });
	});

	it('rejette un objet de référence incohérent', () => {
		expect(() => releaseReferenceSchema.parse({ kind: 'UPC', value: 'abc' })).toThrow();
	});
});
