import { describe, expect, it } from 'vitest';
import { mandateScopeSchema, mandateAllows, departmentOfCommune } from './rules';

const scope = {
	startsAt: new Date('2026-01-01'),
	expiresAt: new Date('2026-12-01'),
	departmentCodes: ['31'],
	allowedActions: ['BOOKING_CREDIT']
};
describe('mandats individuels (DASH-04a)', () => {
	it('borne les dates et refuse les actions et territoires non consentis', () => {
		expect(mandateAllows(scope, 'BOOKING_CREDIT', new Date('2026-01-01'), '31')).toBe(true);
		expect(mandateAllows(scope, 'BOOKING_CREDIT', new Date('2025-12-31'), '31')).toBe(false);
		expect(mandateAllows(scope, 'BOOKING_CREDIT', new Date('2026-12-01'), '31')).toBe(false);
		expect(mandateAllows(scope, 'BOOKING_CREDIT', new Date('2026-06-01'), '32')).toBe(false);
		expect(mandateAllows(scope, 'BOOKING_CREDIT', new Date('2026-06-01'), null)).toBe(false);
		expect(mandateAllows(scope, 'SIGN_CONTRACT', new Date('2026-06-01'), '31')).toBe(false);
		expect(mandateAllows(scope, 'BOOKING_CREDIT', new Date('invalid'), '31')).toBe(false);
	});
	it('valide des dates réelles, les départements et une activité explicite', () => {
		const valid = {
			startsOn: '2026-01-01',
			expiresOn: '2026-12-01',
			departmentCodes: ['31', '2A', '971'],
			allowedActions: ['BOOKING_CREDIT']
		};
		expect(mandateScopeSchema.safeParse(valid).success).toBe(true);
		for (const change of [
			{ startsOn: '2026-02-30' },
			{ expiresOn: '2025-01-01' },
			{ departmentCodes: ['20'] },
			{ allowedActions: [] },
			{ allowedActions: ['SIGN_CONTRACT'] }
		]) {
			expect(mandateScopeSchema.safeParse({ ...valid, ...change }).success).toBe(false);
		}
	});
	it('déduit le département de la commune du concert, Corse et outre-mer compris', () => {
		expect(departmentOfCommune('31555')).toBe('31');
		expect(departmentOfCommune('2A004')).toBe('2A');
		expect(departmentOfCommune('97105')).toBe('971');
		expect(departmentOfCommune(null)).toBeNull();
	});
});
