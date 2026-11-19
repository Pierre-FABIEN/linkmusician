import { describe, expect, it } from 'vitest';
import {
	askToInvite,
	bulkInviteSummary,
	capabilitiesToPropose,
	matchCandidate,
	removalEffects,
	sortCandidates,
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

describe('U3 : écrans de l’équipe', () => {
	const c = (id: string, name: string, member = false) => ({
		id,
		handle: id,
		name,
		member,
		canCoordinate: true
	});

	it('candidats : membres du groupe d’abord, puis par nom (accents compris), ordre stable', () => {
		const out = sortCandidates([
			c('z', 'Zoé'),
			c('e', 'Élodie'),
			c('m', 'Marc', true),
			c('a', 'Ana')
		]);
		expect(out.map((x) => x.id)).toEqual(['m', 'a', 'e', 'z']);
	});

	it('recherche : nom sans accents, @identifiant, requête vide', () => {
		const ines = { name: 'Inès Durand', handle: 'ines.son' };
		expect(matchCandidate(ines, 'ines')).toBe(true);
		expect(matchCandidate(ines, '@ines.so')).toBe(true);
		expect(matchCandidate(ines, 'DUR')).toBe(true);
		expect(matchCandidate(ines, 'sam')).toBe(false);
		expect(matchCandidate(ines, '  ')).toBe(true);
	});

	it('effets d’un retrait, d’un départ, d’une invitation annulée (§8.2), sans tâche (P13)', () => {
		expect(removalEffects({ name: 'Sam', self: false, invited: false, coordinate: true })).toBe(
			'Sam ne verra plus ce projet ni ce qui y est partagé. Sa coordination s’arrête avec. Ses morceaux restent à Sam, avec leurs crédits.'
		);
		expect(removalEffects({ name: 'Sam', self: false, invited: true, coordinate: false })).toMatch(
			/^L’invitation de Sam est annulée/
		);
		const self = removalEffects({ name: 'Toi', self: true, invited: false, coordinate: false });
		expect(self).toMatch(/^Tu ne verras plus ce projet/);
		expect(self).not.toMatch(/coordination/);
		expect(self).not.toMatch(/tâche/);
	});

	it('participation simple : à qui demander une invitation (§8.1)', () => {
		expect(askToInvite(['Sam'], 'Lumière')).toBe('Pour inviter quelqu’un, demande à Sam.');
		expect(askToInvite([], 'Lumière')).toBe('Pour inviter quelqu’un, demande à Lumière.');
		expect(askToInvite(['Sam', 'Inès', 'Léa'], 'Lumière')).toBe(
			'Pour inviter quelqu’un, demande à Sam ou à Inès.'
		);
	});

	it('bilan d’une série : noms ou nombre, quota dit, refus muets', () => {
		expect(bulkInviteSummary({ invited: ['Ana'], skipped: 0, quota: null })).toBe(
			'Invitation envoyée à Ana. Chacun·e choisit de rejoindre ou non.'
		);
		expect(bulkInviteSummary({ invited: 1, skipped: 0, quota: null })).toMatch(
			/^1 invitation envoyée\./
		);
		expect(bulkInviteSummary({ invited: ['A', 'B'], skipped: 1, quota: null })).toBe(
			'2 invitations envoyées. Une personne ne peut pas recevoir d’invitation pour l’instant. Chacun·e choisit de rejoindre ou non.'
		);
		const full = bulkInviteSummary({ invited: [], skipped: 3, quota: 'Quota atteint.' });
		expect(full).toBe('Aucune invitation envoyée. Quota atteint.');
		// Jamais la raison d'un refus (mineur·e, blocage, refus récent).
		expect(bulkInviteSummary({ invited: [], skipped: 2, quota: null })).not.toMatch(
			/mineur|bloqu|refus/
		);
	});
});
