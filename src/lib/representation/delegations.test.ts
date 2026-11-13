import { describe, expect, it } from 'vitest';
import { delegationAllows, delegationProposalSchema } from './delegations';
const now = new Date('2026-11-13');
const row = {
	actions: ['VIEW_MANDATE'],
	acceptedAt: now,
	approvedAt: now,
	endedAt: null,
	expiresAt: new Date('2026-12-01')
};
describe('accords et droits des affectations (DASH-04b)', () => {
	it('demande les deux accords et le droit exact', () => {
		expect(delegationAllows(row, 'VIEW_MANDATE', now)).toBe(true);
		expect(delegationAllows({ ...row, acceptedAt: null }, 'VIEW_MANDATE', now)).toBe(false);
		expect(delegationAllows({ ...row, approvedAt: null }, 'VIEW_MANDATE', now)).toBe(false);
		expect(delegationAllows(row, 'END_MANDATE', now)).toBe(false);
		expect(delegationAllows(row, 'SIGN_CONTRACT', now)).toBe(false);
	});
	it('respecte retrait et fin exclusive', () => {
		expect(delegationAllows({ ...row, endedAt: now }, 'VIEW_MANDATE', now)).toBe(false);
		expect(delegationAllows(row, 'VIEW_MANDATE', new Date('2026-12-01'))).toBe(false);
	});
	it('valide une date réelle et n’accorde pas la fin par défaut', () => {
		expect(
			delegationProposalSchema.parse({
				representationId: 'parent',
				agencyId: 'agence',
				delegate: '@collab'
			}).allowEnd
		).toBe(false);
		expect(
			delegationProposalSchema.safeParse({
				representationId: 'parent',
				agencyId: 'agence',
				delegate: '@collab',
				expiresOn: '2026-02-30'
			}).success
		).toBe(false);
	});
});
