import { describe, expect, it } from 'vitest';
import {
	agencyInviteSchema,
	agencyNameSchema,
	mayInviteAgencyRole,
	mayRemoveAgencyMember
} from './rules';
import { structurePermissions, participationLabel } from '#lib/structures/rules';
describe('agences : rôles explicites (DASH-02b)', () => {
	it('ne permet pas d’inviter un responsable ni d’inventer un rôle', () => {
		for (const role of ['OWNER', 'MODERATOR', 'SIGNATORY'])
			expect(agencyInviteSchema.safeParse({ handle: 'personne', role }).success).toBe(false);
		expect(agencyNameSchema.safeParse({ name: '  ' }).success).toBe(false);
	});
	it('réserve la co-gestion au responsable et protège les membres actifs', () => {
		expect(mayInviteAgencyRole('OWNER', 'ADMIN')).toBe(true);
		expect(mayInviteAgencyRole('ADMIN', 'ADMIN')).toBe(false);
		expect(mayInviteAgencyRole('ADMIN', 'MEMBER')).toBe(true);
		expect(mayInviteAgencyRole('MEMBER', 'MEMBER')).toBe(false);
		expect(mayRemoveAgencyMember('ADMIN', 'MEMBER', 'ACTIVE', false)).toBe(false);
		expect(mayRemoveAgencyMember('ADMIN', 'MEMBER', 'INVITED', false)).toBe(true);
		expect(mayRemoveAgencyMember('OWNER', 'ADMIN', 'ACTIVE', false)).toBe(true);
	});
	it('n’accorde aucun droit artistique ou administratif au collaborateur', () => {
		expect(structurePermissions('AGENCY', 'ACTIVE', 'MEMBER')).toEqual([]);
		expect(structurePermissions('AGENCY', 'INVITED', 'ADMIN')).toEqual([]);
		expect(structurePermissions('AGENCY', 'ACTIVE', 'ADMIN')).toEqual(['manage', 'agency.manage']);
		expect(participationLabel('AGENCY', 'ACTIVE', 'MEMBER')).toBe('Collaborateur·rice');
	});
});
