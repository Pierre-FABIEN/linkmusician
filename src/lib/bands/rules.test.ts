import { describe, expect, it } from 'vitest';
import {
	bandSchema,
	canRemove,
	formsBand,
	inviteSchema,
	isManager,
	leaveCheck,
	periodLabel,
	successorOf
} from './rules';

describe('formulaire de groupe', () => {
	it('nettoie le nom et le rôle', () => {
		expect(bandSchema.parse({ name: '  Les\n  Vaches   Folles ', title: ' basse ' })).toEqual({
			name: 'Les Vaches Folles',
			title: 'basse'
		});
	});
	it.each([
		['trop court', { name: 'A' }],
		['trop long', { name: 'x'.repeat(61) }],
		['rôle trop long', { name: 'Ok', title: 'y'.repeat(61) }]
	])('refuse : %s', (_, input) => {
		expect(bandSchema.safeParse(input).success).toBe(false);
	});
	it('rôle facultatif', () => {
		expect(bandSchema.parse({ name: 'Ok' }).title).toBeNull();
	});
	it('invitation : @ et majuscules retirés', () => {
		expect(inviteSchema.parse({ handle: ' @Malik-Batterie ' }).handle).toBe('malik-batterie');
		expect(inviteSchema.safeParse({ handle: '  ' }).success).toBe(false);
	});
});

describe('droits', () => {
	it('gèrent : OWNER et ADMIN', () => {
		expect([isManager('OWNER'), isManager('ADMIN'), isManager('MEMBER'), isManager(null)]).toEqual([
			true,
			true,
			false,
			false
		]);
	});
	it.each([
		['OWNER', 'ADMIN', true],
		['OWNER', 'MEMBER', true],
		['OWNER', 'OWNER', false],
		['ADMIN', 'MEMBER', true],
		['ADMIN', 'ADMIN', false],
		['ADMIN', 'OWNER', false],
		['MEMBER', 'MEMBER', false]
	] as const)('%s retire %s : %s', (actor, target, expected) => {
		expect(canRemove(actor, target)).toBe(expected);
	});
});

describe('un groupe a toujours un OWNER', () => {
	it('un membre part librement', () => {
		expect(leaveCheck('MEMBER', 4)).toEqual({ ok: true, dissolves: false });
		expect(leaveCheck('ADMIN', 2)).toEqual({ ok: true, dissolves: false });
	});
	it('l’OWNER transmet avant de partir', () => {
		expect(leaveCheck('OWNER', 2)).toEqual({ ok: false, reason: 'owner_must_transfer' });
	});
	it('l’OWNER seul dissout le groupe', () => {
		expect(leaveCheck('OWNER', 1)).toEqual({ ok: true, dissolves: true });
	});
	it('successeur : co-gestion la plus ancienne, sinon le membre le plus ancien', () => {
		const d = (m: number) => new Date(Date.UTC(2026, m, 1));
		const members = [
			{ personId: 'owner', role: 'OWNER' as const, startedAt: d(0) },
			{ personId: 'm1', role: 'MEMBER' as const, startedAt: d(1) },
			{ personId: 'a2', role: 'ADMIN' as const, startedAt: d(5) },
			{ personId: 'a1', role: 'ADMIN' as const, startedAt: d(3) }
		];
		expect(successorOf('owner', members)?.personId).toBe('a1');
		expect(
			successorOf(
				'owner',
				members.filter((m) => m.role !== 'ADMIN')
			)?.personId
		).toBe('m1');
		expect(successorOf('owner', members.slice(0, 1))).toBeNull();
	});
});

describe('formation', () => {
	it('à la 2ᵉ adhésion active, une seule fois', () => {
		expect(formsBand({ formedAt: null, activeMembers: 1 })).toBe(false);
		expect(formsBand({ formedAt: null, activeMembers: 2 })).toBe(true);
		expect(formsBand({ formedAt: new Date(), activeMembers: 3 })).toBe(false);
	});
});

describe('périodes', () => {
	const d = (y: number, m: number) => new Date(Date.UTC(y, m, 15));
	it('en cours, close, sur un seul mois', () => {
		expect(periodLabel(d(2026, 2), null)).toBe('depuis mars 2026');
		expect(periodLabel(d(2026, 2), d(2026, 5))).toBe('mars 2026 – juin 2026');
		expect(periodLabel(d(2026, 2), d(2026, 2))).toBe('mars 2026');
		expect(periodLabel(null, null)).toBe('');
	});
});
