import { z } from 'zod';
export const agencyNameSchema = z.object({
	name: z.string().trim().min(3, 'Trois caractères au moins.').max(80, '80 caractères au plus.')
});
export const agencyInviteSchema = z.object({
	handle: z
		.string()
		.trim()
		.regex(/^@?[a-z0-9][a-z0-9_-]{1,59}$/i, 'Nom d’utilisateur invalide.'),
	role: z.enum(['ADMIN', 'MEMBER'])
});
export const MAX_AGENCIES = 3;
export const MAX_AGENCY_INVITES = 5;
/** Aucun droit de représentation ni de signature n’est déduit de ces rôles. */
export function mayInviteAgencyRole(byRole: string, targetRole: string) {
	return (
		(byRole === 'OWNER' && ['ADMIN', 'MEMBER'].includes(targetRole)) ||
		(byRole === 'ADMIN' && targetRole === 'MEMBER')
	);
}
export function mayRemoveAgencyMember(
	byRole: string,
	targetRole: string,
	status: string,
	self: boolean
) {
	if (self) return true;
	return (
		(byRole === 'OWNER' && targetRole !== 'OWNER') ||
		(byRole === 'ADMIN' && targetRole === 'MEMBER' && status === 'INVITED')
	);
}
