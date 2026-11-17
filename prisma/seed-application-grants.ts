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

/** DASH-07b : annonce de démonstration, sans accorder de droit ni envoyer de candidature. */
export async function seedDelegatedOpportunity(prisma: PrismaClient) {
	const title = 'Scène ouverte aux projets accompagnés';
	const source = await prisma.opportunity.findFirst({
		where: {
			kind: 'GIG_SLOT',
			venueId: { not: null },
			issuer: { deletedAt: null, person: { user: { email: { endsWith: DEMO } } } }
		},
		orderBy: { id: 'asc' },
		select: { issuerActorId: true, venueId: true }
	});
	if (
		!source ||
		(await prisma.opportunity.count({ where: { title, issuerActorId: source.issuerActorId } }))
	)
		return;
	const startsAt = new Date(Date.now() + 14 * DAY);
	await prisma.opportunity.create({
		data: {
			...source,
			kind: 'GIG_SLOT',
			title,
			description:
				'Un plateau ouvert aux groupes de la région, avec ou sans accompagnement. Présentez votre répertoire et vos disponibilités.',
			startsAt,
			expiresAt: startsAt,
			slots: 4,
			radiusKm: 100
		}
	});
}
