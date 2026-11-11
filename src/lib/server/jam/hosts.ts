/**
 * Hôte d'une jam (P5-04a). Une jam est publiée par une personne (D51) ou,
 * pour une scène ouverte récurrente, au nom d'un lieu (organisation
 * `VENUE`) : toutes les personnes qui gèrent le lieu (OWNER, ADMIN) en sont
 * alors hôtes. Elles désignent le lead, retirent un faux présent, etc.
 */
import type { Prisma } from '@prisma/client';

const MANAGER_ROLES: Prisma.EnumOrgRoleFilter<'Membership'> = { in: ['OWNER', 'ADMIN'] };

const managerMembership = (personId: string): Prisma.MembershipWhereInput => ({
	personId,
	status: 'ACTIVE',
	role: MANAGER_ROLES,
	org: { dissolvedAt: null }
});

/** Filtre Prisma : jams dont la personne est hôte (elle-même, ou un lieu qu'elle gère). */
export const hostedBy = (personId: string): Prisma.OpportunityWhereInput => ({
	OR: [
		{ issuerActorId: personId },
		{ issuer: { organization: { memberships: { some: managerMembership(personId) } } } }
	]
});

/** Sélection Prisma des personnes qui gèrent l'émetteur, s'il est une organisation. */
export const issuerManagersSelect = {
	organization: {
		select: {
			memberships: {
				where: { status: 'ACTIVE' as const, role: MANAGER_ROLES },
				select: { personId: true }
			}
		}
	}
} satisfies Prisma.ActorSelect;

type WithIssuerManagers = {
	issuerActorId: string;
	issuer: { organization: { memberships: { personId: string }[] } | null };
};

/** Identifiants des hôtes : l'émetteur et, pour un lieu, ses gestionnaires. */
export const hostIdsOf = (jam: WithIssuerManagers) => [
	jam.issuerActorId,
	...(jam.issuer.organization?.memberships.map((m) => m.personId) ?? [])
];

export const isHostOf = (jam: WithIssuerManagers, personId: string) =>
	hostIdsOf(jam).includes(personId);
