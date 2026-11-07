import { describe, expect, it } from 'vitest';
import {
	attesterBlocker,
	checkEvidenceUrl,
	corroborationMet,
	proofChecklist,
	type ProofState
} from './proofs';

const none: ProofState = { attestations: [], evidence: [] };
const member = { role: 'MEMBER' as const, status: 'CONFIRMED' as const };
const outsider = { role: 'OUTSIDER' as const, status: 'CONFIRMED' as const };
const event = { kind: 'EVENT' as const, status: 'ACCEPTED' as const };

describe('ce qui corrobore une étape (D43)', () => {
	it('répétition : un autre membre confirme', () => {
		expect(corroborationMet('FIRST_REHEARSAL', none)).toBe(false);
		expect(corroborationMet('FIRST_REHEARSAL', { ...none, attestations: [member] })).toBe(true);
		expect(corroborationMet('FIRST_REHEARSAL', { ...none, attestations: [outsider] })).toBe(false);
	});

	it('concert : un lien ET une personne hors groupe ; un membre seul ne suffit pas', () => {
		expect(corroborationMet('FIRST_GIG', { attestations: [member], evidence: [event] })).toBe(
			false
		);
		expect(corroborationMet('FIRST_GIG', { attestations: [outsider], evidence: [] })).toBe(false);
		expect(
			corroborationMet('FIRST_GIG', {
				attestations: [outsider],
				evidence: [{ kind: 'EVENT', status: 'PENDING' }]
			})
		).toBe(false);
		expect(corroborationMet('FIRST_GIG', { attestations: [outsider], evidence: [event] })).toBe(
			true
		);
		expect(
			corroborationMet('FIRST_GIG', {
				attestations: [{ role: 'OUTSIDER', status: 'DECLINED' }],
				evidence: [event]
			})
		).toBe(false);
	});

	it('enregistrement : une personne hors groupe, le lien est facultatif', () => {
		expect(corroborationMet('FIRST_RECORDING', { ...none, attestations: [outsider] })).toBe(true);
	});

	it('démo : un lien d’écoute accepté par la modération', () => {
		const listen = (status: 'PENDING' | 'ACCEPTED' | 'REJECTED') => ({
			...none,
			evidence: [{ kind: 'LISTEN' as const, status }]
		});
		expect(corroborationMet('FIRST_PUBLIC_DEMO', listen('PENDING'))).toBe(false);
		expect(corroborationMet('FIRST_PUBLIC_DEMO', listen('REJECTED'))).toBe(false);
		expect(corroborationMet('FIRST_PUBLIC_DEMO', listen('ACCEPTED'))).toBe(true);
	});

	it('formation et composition ne se prouvent pas ici', () => {
		const all = { attestations: [member, outsider], evidence: [event] };
		expect(corroborationMet('FORMATION', all)).toBe(false);
		expect(corroborationMet('FIRST_COMPOSITION', all)).toBe(false);
	});

	it('la liste dit ce qu’il reste à faire', () => {
		expect(
			proofChecklist('FIRST_GIG', {
				attestations: [{ role: 'OUTSIDER', status: 'REQUESTED' }],
				evidence: [event]
			})
		).toEqual([
			{ label: 'Un lien vers l’événement ou l’affiche en ligne', done: true, pending: false },
			{ label: 'Une personne hors du groupe qui y était confirme', done: false, pending: true }
		]);
		expect(proofChecklist('FORMATION', none)).toEqual([]);
	});
});

describe('qui peut confirmer', () => {
	const base = {
		self: false,
		declaredByThem: false,
		everMember: false,
		presentAtDate: false,
		trustLevel: 1,
		blocked: false,
		minorUnknown: false
	};

	it('hors groupe : jamais un membre ou ancien membre, confiance TL1', () => {
		expect(attesterBlocker({ ...base, role: 'OUTSIDER' })).toBeNull();
		expect(attesterBlocker({ ...base, role: 'OUTSIDER', everMember: true })).toMatch(/extérieure/);
		expect(attesterBlocker({ ...base, role: 'OUTSIDER', trustLevel: 0 })).toMatch(
			/vient d’arriver/
		);
	});

	it('membre : présent à la date, autre que qui l’a déclarée', () => {
		const m = { ...base, role: 'MEMBER' as const, everMember: true, presentAtDate: true };
		expect(attesterBlocker(m)).toBeNull();
		expect(attesterBlocker({ ...m, presentAtDate: false })).toMatch(/présent/);
		expect(attesterBlocker({ ...m, declaredByThem: true })).toMatch(/autre membre/);
	});

	it('jamais soi-même, ni à travers un blocage, ni un·e mineur·e inconnu·e (sans dire pourquoi)', () => {
		expect(attesterBlocker({ ...base, role: 'OUTSIDER', self: true })).toMatch(/toi/);
		const hidden = 'Cette personne ne peut pas confirmer cette étape.';
		expect(attesterBlocker({ ...base, role: 'OUTSIDER', blocked: true })).toBe(hidden);
		expect(attesterBlocker({ ...base, role: 'OUTSIDER', minorUnknown: true })).toBe(hidden);
	});
});

describe('liens joints', () => {
	it('un lien d’écoute vient d’une plateforme d’écoute', () => {
		expect(checkEvidenceUrl('LISTEN', 'https://lesrats.bandcamp.com/track/x')).toEqual({
			ok: true,
			url: 'https://lesrats.bandcamp.com/track/x'
		});
		expect(checkEvidenceUrl('LISTEN', 'https://www.youtube.com/watch?v=abc#t=3')).toEqual({
			ok: true,
			url: 'https://www.youtube.com/watch?v=abc'
		});
		expect(checkEvidenceUrl('LISTEN', 'https://example.com/demo').ok).toBe(false);
	});

	it('un lien d’événement est n’importe quel lien https', () => {
		expect(checkEvidenceUrl('EVENT', 'https://www.instagram.com/p/abc/').ok).toBe(true);
		expect(checkEvidenceUrl('EVENT', 'http://bar.fr/agenda').ok).toBe(false);
		expect(checkEvidenceUrl('EVENT', 'pas un lien').ok).toBe(false);
		expect(checkEvidenceUrl('EVENT', '').ok).toBe(false);
	});
});
