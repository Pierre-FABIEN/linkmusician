/**
 * Réseau musical (P2-16) : les gens avec qui l'on a vraiment joué et que
 * l'on garde (« Garder le contact »). On ne peut garder que quelqu'un avec
 * qui l'on a une collaboration confirmée. Une présence commune à une jam ne
 * compte plus (D81) : déclarée librement, elle ne prouve rien, et s'en servir
 * permettait de tester où était quelqu'un.
 *
 * Le réseau remonte en tête des recherches et des suggestions
 * d'invitation. Il n'a rien à voir avec l'XP, et reste privé.
 */
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { othersAttendanceVisibleTo } from '#lib/server/privacy/activities';

export class NetworkError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

/** Les deux personnes ont joué ensemble : collaboration confirmée (D81, jamais une jam). */
export async function playedTogether(a: string, b: string): Promise<boolean> {
	if (a === b) return false;
	const collaboration = await prisma.collaboration.findFirst({
		where: {
			status: 'COMPLETED',
			AND: [{ participants: { some: { actorId: a } } }, { participants: { some: { actorId: b } } }]
		},
		select: { id: true }
	});
	return Boolean(collaboration);
}

/** « Garder le contact » : ajoute la personne à son réseau musical. */
export async function keepInTouch(ownerId: string, handle: string, now = new Date()) {
	const contact = await prisma.actor.findFirst({
		where: { handle, person: { isNot: null }, ...publicActorWhere(now, ownerId) },
		select: { id: true, displayName: true }
	});
	if (!contact) throw new NetworkError('Personne inconnue.', 404);
	if (!(await playedTogether(ownerId, contact.id))) {
		throw new NetworkError('Ton réseau musical, ce sont les gens avec qui tu as vraiment joué.');
	}
	await prisma.musicalTie.upsert({
		where: { ownerId_contactId: { ownerId, contactId: contact.id } },
		create: { ownerId, contactId: contact.id },
		update: {}
	});
	return contact;
}

export async function leaveNetwork(ownerId: string, handle: string) {
	await prisma.musicalTie.deleteMany({ where: { ownerId, contact: { handle } } });
}

/** Identifiants des personnes de son réseau (pour marquer les cartes). */
export async function networkIdsOf(ownerId: string): Promise<Set<string>> {
	const ties = await prisma.musicalTie.findMany({
		where: { ownerId },
		select: { contactId: true }
	});
	return new Set(ties.map((t) => t.contactId));
}

/** Son réseau musical : visible, avec instruments et jams partagées. */
export async function myNetwork(ownerId: string, now = new Date()) {
	const ties = await prisma.musicalTie.findMany({
		where: { ownerId, contact: publicActorWhere(now, ownerId) },
		orderBy: { createdAt: 'desc' },
		select: {
			createdAt: true,
			contact: {
				select: {
					id: true,
					handle: true,
					displayName: true,
					person: {
						select: {
							instruments: {
								orderBy: [{ isPrimary: 'desc' }, { declaredLevel: 'desc' }],
								take: 2,
								select: { instrument: { select: { name: true } } }
							}
						}
					}
				}
			}
		}
	});
	const shared = await prisma.jamAttendance.groupBy({
		by: ['actorId'],
		where: {
			actorId: { in: ties.map((t) => t.contact.id) },
			attendedAt: { not: null },
			opportunity: { attendances: { some: { actorId: ownerId, attendedAt: { not: null } } } },
			// Un contact gardé d'un seul côté ne révèle pas ses jams (D81).
			...othersAttendanceVisibleTo(ownerId, 'contacts')
		},
		_count: { _all: true }
	});
	const jamsWith = new Map(shared.map((s) => [s.actorId, s._count._all]));
	return ties.map((t) => ({
		handle: t.contact.handle,
		displayName: t.contact.displayName,
		instruments: t.contact.person?.instruments.map((i) => i.instrument.name) ?? [],
		jamsTogether: jamsWith.get(t.contact.id) ?? 0,
		since: t.createdAt
	}));
}

/**
 * Suggestions pour inviter à une jam : son réseau d'abord, puis les
 * conversations acceptées et les partenaires de collaboration.
 */
export async function inviteSuggestions(actorId: string, now = new Date()): Promise<string[]> {
	const visible = publicActorWhere(now, actorId);
	const [ties, others] = await Promise.all([
		prisma.musicalTie.findMany({
			where: { ownerId: actorId, contact: visible },
			orderBy: { createdAt: 'desc' },
			take: 50,
			select: { contact: { select: { handle: true } } }
		}),
		prisma.actor.findMany({
			where: {
				id: { not: actorId },
				person: { isNot: null },
				...visible,
				OR: [
					{
						conversationParticipants: {
							some: {
								state: 'ACCEPTED',
								conversation: { participants: { some: { actorId, state: 'ACCEPTED' } } }
							}
						}
					},
					{ collaborations: { some: { collaboration: { participants: { some: { actorId } } } } } }
				]
			},
			orderBy: { displayName: 'asc' },
			take: 50,
			select: { handle: true }
		})
	]);
	const handles = ties.map((t) => t.contact.handle);
	for (const o of others) if (!handles.includes(o.handle)) handles.push(o.handle);
	return handles;
}
