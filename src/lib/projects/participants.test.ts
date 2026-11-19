import { describe, expect, it } from 'vitest';
import {
	capabilitiesToPropose,
	declinedRecently,
	effectiveCapabilities,
	inviteRefusal,
	projectRole,
	REINVITE_AFTER_DECLINE_DAYS
} from './participants';

const base = {
	status: 'ACTIVE' as const,
	capabilities: ['COORDINATE' as const],
	asMember: false,
	memberNow: false,
	minor: false
};

describe('effectiveCapabilities (§9.1, §6.3)', () => {
	it('une participation active garde ses capacités consenties', () => {
		expect(effectiveCapabilities(base)).toEqual(['COORDINATE']);
	});
	it('rien hors d’une participation active', () => {
		for (const status of ['INVITED', 'DECLINED', 'LEFT', 'REMOVED'] as const)
			expect(effectiveCapabilities({ ...base, status })).toEqual([]);
	});
	it('reçue comme membre : tombe au départ de l’organisation', () => {
		expect(effectiveCapabilities({ ...base, asMember: true, memberNow: true })).toEqual([
			'COORDINATE'
		]);
		expect(effectiveCapabilities({ ...base, asMember: true, memberNow: false })).toEqual([]);
	});
	it('une personne extérieure la garde, membre ou non', () => {
		expect(effectiveCapabilities({ ...base, asMember: false, memberNow: false })).toEqual([
			'COORDINATE'
		]);
	});
	it('jamais pour un·e mineur·e, même si une ligne en porte', () => {
		expect(effectiveCapabilities({ ...base, minor: true })).toEqual([]);
	});
});

describe('projectRole', () => {
	it('la gestion prime ; sinon coordination ou participation ; sinon rien', () => {
		expect(projectRole({ manage: true, capabilities: [], participant: false })).toBe('manage');
		expect(projectRole({ manage: false, capabilities: ['COORDINATE'], participant: true })).toBe(
			'coordinate'
		);
		expect(projectRole({ manage: false, capabilities: [], participant: true })).toBe('participate');
		expect(projectRole({ manage: false, capabilities: [], participant: false })).toBeNull();
	});
});

describe('inviteRefusal (I11, D46, Q-G0-12)', () => {
	const adult = { minor: false, minorIsMemberOfOwnerBand: false };
	it('la gestion propose la coordination ; la coordination invite seulement des participant·es', () => {
		expect(inviteRefusal({ manage: true, capabilities: ['COORDINATE'], ...adult })).toBeNull();
		expect(inviteRefusal({ manage: false, capabilities: [], ...adult })).toBeNull();
		expect(inviteRefusal({ manage: false, capabilities: ['COORDINATE'], ...adult })).toBe(
			'capabilities'
		);
	});
	it('mineur·e : membre du groupe porteur, sans capacité', () => {
		expect(
			inviteRefusal({ manage: true, capabilities: [], minor: true, minorIsMemberOfOwnerBand: true })
		).toBeNull();
		expect(
			inviteRefusal({
				manage: true,
				capabilities: [],
				minor: true,
				minorIsMemberOfOwnerBand: false
			})
		).toBe('minorOwner');
		expect(
			inviteRefusal({
				manage: true,
				capabilities: ['COORDINATE'],
				minor: true,
				minorIsMemberOfOwnerBand: true
			})
		).toBe('minorCapability');
	});
});

describe('declinedRecently, capabilitiesToPropose', () => {
	const now = new Date('2026-11-19T12:00:00Z');
	it('un refus bloque la réinvitation pendant le délai', () => {
		expect(declinedRecently(null, now)).toBe(false);
		expect(declinedRecently(new Date('2026-11-18T12:00:00Z'), now)).toBe(true);
		const old = new Date(now.getTime() - (REINVITE_AFTER_DECLINE_DAYS + 1) * 86_400_000);
		expect(declinedRecently(old, now)).toBe(false);
	});
	it('ne propose que ce qui n’est ni accordé ni déjà proposé', () => {
		expect(capabilitiesToPropose(['COORDINATE'], [], [])).toEqual(['COORDINATE']);
		expect(capabilitiesToPropose(['COORDINATE'], ['COORDINATE'], [])).toEqual([]);
		expect(capabilitiesToPropose(['COORDINATE'], [], ['COORDINATE'])).toEqual([]);
	});
});
