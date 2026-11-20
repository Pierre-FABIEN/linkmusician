import { describe, expect, it } from 'vitest';
import { decideActivityVisibility, privacyModesSchema, type VisibilityFacts } from './activities';

const base: VisibilityFacts = {
	self: false,
	blocked: false,
	excluded: false,
	ownerMinor: false,
	viewerMinor: false,
	mode: 'PRIVATE',
	granted: false,
	bothDiscoverable: false
};
const can = (patch: Partial<VisibilityFacts>) => decideActivityVisibility({ ...base, ...patch });

describe('décision de visibilité des activités (D81)', () => {
	it('privé par défaut, soi-même toujours', () => {
		expect(can({})).toBe(false);
		expect(can({ self: true })).toBe(true);
	});

	it('un contact du carnet ou une autorisation sans partage ne suffisent pas', () => {
		expect(can({ granted: true })).toBe(false);
	});

	it('partage choisi : seules les personnes autorisées', () => {
		expect(can({ mode: 'SELECTED' })).toBe(false);
		expect(can({ mode: 'SELECTED', granted: true })).toBe(true);
	});

	it('public : tout membre', () => {
		expect(can({ mode: 'PUBLIC' })).toBe(true);
	});

	it('l’exclusion et le blocage l’emportent sur tout partage', () => {
		for (const patch of [{ excluded: true }, { blocked: true }]) {
			expect(can({ ...patch, mode: 'PUBLIC' })).toBe(false);
			expect(can({ ...patch, mode: 'SELECTED', granted: true })).toBe(false);
			expect(can({ ...patch, bothDiscoverable: true })).toBe(false);
		}
	});

	it('découverte sur place : réciproque, jamais pour un·e mineur·e', () => {
		expect(can({ bothDiscoverable: true })).toBe(true);
		expect(can({ bothDiscoverable: true, ownerMinor: true })).toBe(false);
		expect(can({ bothDiscoverable: true, viewerMinor: true })).toBe(false);
	});

	it('un·e mineur·e n’est jamais public·que : il faut une autorisation', () => {
		expect(can({ ownerMinor: true, mode: 'PUBLIC' })).toBe(false);
		expect(can({ ownerMinor: true, mode: 'PUBLIC', granted: true })).toBe(true);
	});

	it('le partage public exige un consentement explicite', () => {
		expect(privacyModesSchema.safeParse({ past: 'PUBLIC', future: 'PRIVATE' }).success).toBe(false);
		expect(
			privacyModesSchema.safeParse({ past: 'PUBLIC', future: 'PRIVATE', publicConsent: true })
				.success
		).toBe(true);
		expect(privacyModesSchema.safeParse({ past: 'SELECTED', future: 'PRIVATE' }).success).toBe(
			true
		);
	});
});
