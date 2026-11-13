import type { PrismaClient } from '@prisma/client';
/** Une proposition de démo, jamais un accord donné à la place d’un vrai compte. */
export async function seedDelegations(prisma: PrismaClient) {
	const agency = await prisma.actor.findFirst({
		where: {
			handle: 'agence-demo-scene',
			organization: {
				kind: 'AGENCY',
				dissolvedAt: null,
				memberships: {
					some: {
						role: 'OWNER',
						status: 'ACTIVE',
						person: { person: { user: { email: { endsWith: '@demo.linkmusician.test' } } } }
					}
				}
			}
		},
		select: { id: true }
	});
	if (!agency) return;
	const memberships = await prisma.membership.findMany({
		where: {
			orgId: agency.id,
			status: 'ACTIVE',
			person: { person: { user: { email: { endsWith: '@demo.linkmusician.test' } } } }
		},
		select: {
			id: true,
			personId: true,
			person: { select: { person: { select: { tracks: { select: { track: true } } } } } }
		}
	});
	const agent = memberships.find((m) => m.person.person?.tracks.some((t) => t.track === 'BOOKER'));
	const delegate = memberships.find(
		(m) =>
			m.personId !== agent?.personId && m.person.person?.tracks.some((t) => t.track === 'MANAGER')
	);
	if (!agent || !delegate) return;
	const parent = await prisma.representation.findFirst({
		where: {
			agentId: agent.personId,
			status: 'CONFIRMED',
			kind: 'BOOKER',
			AND: [
				{ OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
				{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
			],
			artist: {
				deletedAt: null,
				organization: {
					kind: 'BAND',
					dissolvedAt: null,
					memberships: {
						some: {
							role: 'OWNER',
							status: 'ACTIVE',
							person: { person: { user: { email: { endsWith: '@demo.linkmusician.test' } } } }
						}
					}
				}
			}
		},
		select: { id: true, artistId: true, expiresAt: true, artist: { select: { displayName: true } } }
	});
	if (
		!parent ||
		(await prisma.representationDelegation.findFirst({
			where: { representationId: parent.id, agencyId: agency.id, delegateId: delegate.personId }
		}))
	)
		return;
	const managers = await prisma.membership.findMany({
		where: {
			orgId: parent.artistId,
			status: 'ACTIVE',
			role: { in: ['OWNER', 'ADMIN'] },
			person: { person: { user: { email: { endsWith: '@demo.linkmusician.test' } } } }
		},
		select: { personId: true }
	});
	if (!managers.length) return;
	await prisma.$transaction(async (tx) => {
		const row = await tx.representationDelegation.create({
			data: {
				representationId: parent.id,
				agencyId: agency.id,
				delegateId: delegate.personId,
				agentMembershipId: agent.id,
				delegateMembershipId: delegate.id,
				proposedById: agent.personId,
				expiresAt: parent.expiresAt,
				actions: ['VIEW_MANDATE', 'END_MANDATE']
			}
		});
		await tx.notification.createMany({
			data: [delegate.personId, ...managers.map((m) => m.personId)].map((recipientActorId) => ({
				recipientActorId,
				type: 'DELEGATION_REQUEST' as const,
				fromActorId: agent.personId,
				href: `/delegations/${row.id}`,
				title: `Affectation pour ${parent.artist.displayName}`
			}))
		});
	});
}
