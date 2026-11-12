import { describe, expect, it } from 'vitest';
import { INVITE_TOKEN, inviteState, inviteUsesSchema, schoolSchema } from './rules';

const now = new Date('2026-11-12T10:00:00Z');
const later = new Date('2026-12-12T10:00:00Z');

describe('inviteState', () => {
	const base = { expiresAt: later, revokedAt: null, uses: 0, maxUses: 2 };
	it('valable, puis plein, expiré ou révoqué', () => {
		expect(inviteState(base, now)).toBe('OK');
		expect(inviteState({ ...base, uses: 2 }, now)).toBe('FULL');
		expect(inviteState({ ...base, expiresAt: now }, now)).toBe('EXPIRED');
		expect(inviteState({ ...base, revokedAt: now, uses: 2 }, now)).toBe('REVOKED');
	});
});

describe('schémas', () => {
	it('une école a un nom et un type', () => {
		expect(schoolSchema.safeParse({ name: ' MJC des Arts ', kind: 'MJC' })).toMatchObject({
			success: true,
			data: { name: 'MJC des Arts', kind: 'MJC' }
		});
		expect(schoolSchema.safeParse({ name: 'MJC', kind: 'LYCEE' }).success).toBe(false);
	});
	it('usages bornés, jeton au bon format', () => {
		expect(inviteUsesSchema.safeParse('30').success).toBe(true);
		expect(inviteUsesSchema.safeParse('0').success).toBe(false);
		expect(inviteUsesSchema.safeParse('201').success).toBe(false);
		expect(INVITE_TOKEN.test('a'.repeat(32))).toBe(true);
		expect(INVITE_TOKEN.test('a'.repeat(31) + '/')).toBe(false);
	});
});
