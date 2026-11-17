import type { PrismaClient } from '@prisma/client';

const DEMO = '@demo.linkmusician.test';
const DAY = 86_400_000;

/**
 * DASH-07a : Élise (booker) demande le droit de candidater aux plateaux pour
 * la Fanfare Pirate. La demande attend la gestion du groupe : le seed ne
 * donne jamais l'accord à sa place. Idempotent ; rien si une demande a déjà
 * existé (même refusée ou retirée) ou si le mandat n'est plus en cours.
 */
export async function seedApplicationGrants(prisma: PrismaClient) {
	const now = new Date();
	const parent = await prisma.representation.findFirst({
		where: {
			kind: 'BOOKER',
			status: 'CONFIRMED',
			allowedActions: { has: 'BOOKING_CREDIT' },
			agent: {
				handle: 'elise-booker',
				deletedAt: null,
				person: { user: { email: { endsWith: DEMO } } }
			},
			AND: [
				{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
				{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date(now.getTime() + 2 * DAY) } }] }
			],
			artist: { deletedAt: null, organization: { kind: 'BAND', dissolvedAt: null } }
		},
		select: {
			id: true,
			agentId: true,
			artistId: true,
			expiresAt: true,
			artist: { select: { displayName: true } }
		}
	});
	if (!parent || (await prisma.applicationGrant.count({ where: { representationId: parent.id } })))
		return;
	const managers = await prisma.membership.findMany({
		where: {
			orgId: parent.artistId,
			status: 'ACTIVE',
			role: { in: ['OWNER', 'ADMIN'] },
			person: { person: { user: { email: { endsWith: DEMO } } } }
		},
		select: { personId: true }
	});
	if (!managers.length) return;
	const ninety = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + 90 * DAY
	);
	const expiresAt = parent.expiresAt && parent.expiresAt < ninety ? parent.expiresAt : ninety;
	await prisma.$transaction(async (tx) => {
		const grant = await tx.applicationGrant.create({
			data: {
				representationId: parent.id,
				kinds: ['GIG_SLOT'],
				expiresAt,
				requestedById: parent.agentId,
				acts: { create: { kind: 'REQUESTED', byId: parent.agentId } }
			}
		});
		await tx.notification.createMany({
			data: managers.map((m) => ({
				recipientActorId: m.personId,
				type: 'APPLICATION_GRANT' as const,
				fromActorId: parent.agentId,
				href: `/accompagnement/${grant.representationId}/candidatures`,
				title: `demandé pour ${parent.artist.displayName}`
			}))
		});
	});
}
