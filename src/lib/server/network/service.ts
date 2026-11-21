/**
 * Carnet de contacts (D82, #99 ; ex-« réseau musical » P2-16) : les acteurs
 * que l'on enregistre volontairement (`SavedContact`), depuis un profil,
 * Découvrir ou une jam. Sans prérequis, sans notification, sans réciprocité,
 * et sans aucun droit : ni d'écrire, ni d'inviter, ni de voir ses jams (D81).
 * `MusicalTie` n'est plus écrit (repris dans le carnet).
 *
 * `playedTogether` dit si deux personnes ont **vraiment** joué ensemble :
 * une collaboration confirmée, jamais une jam (déclarée librement).
 *
 * Le carnet fait remonter ses contacts en tête de ses propres recherches et
 * suggestions : privé, sans effet pour l'autre. Jamais l'XP.
 */
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { visibleOwnerIds } from '#lib/server/privacy/activities';

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

/**
 * Enregistrer un acteur visible (personne ou structure) dans son carnet.
 * Idempotent, sans notification. Personne d'invisible n'est révélé : même
 * réponse pour un identifiant inconnu, masqué ou bloqué.
 */
export async function saveContact(ownerId: string, handle: string, now = new Date()) {
	const contact = await prisma.actor.findFirst({
		where: {
			handle: handle.trim().replace(/^@/, '').toLowerCase(),
			...publicActorWhere(now, ownerId)
		},
		select: { id: true, displayName: true }
	});
	if (!contact || contact.id === ownerId) throw new NetworkError('Personne inconnue.', 404);
	await prisma.savedContact.upsert({
		where: { ownerId_contactId: { ownerId, contactId: contact.id } },
		create: { ownerId, contactId: contact.id },
		update: {}
	});
	return contact;
}

/** « Garder le contact » après une jam : même chose qu'enregistrer (D82). */
export const keepInTouch = saveContact;

/** Retirer du carnet : sans notification ; possible même si le profil n'est plus visible. */
export async function removeContact(ownerId: string, handle: string) {
	await prisma.savedContact.deleteMany({
		where: { ownerId, contact: { handle: handle.trim().replace(/^@/, '').toLowerCase() } }
	});
}
export const leaveNetwork = removeContact;

/** L'acteur de cet identifiant est-il dans mon carnet ? (profil, sans rien révéler d'autre) */
export async function isSavedHandle(ownerId: string, handle: string) {
	return (
		(await prisma.savedContact.count({
			where: { ownerId, contact: { handle: handle.trim().replace(/^@/, '').toLowerCase() } }
		})) > 0
	);
}

/** Est-il dans mon carnet ? */
export async function isSaved(ownerId: string, contactId: string) {
	return (await prisma.savedContact.count({ where: { ownerId, contactId } })) > 0;
}

/** Identifiants de son carnet (pour marquer les cartes). */
export async function networkIdsOf(ownerId: string): Promise<Set<string>> {
	const saved = await prisma.savedContact.findMany({
		where: { ownerId },
		select: { contactId: true }
	});
	return new Set(saved.map((t) => t.contactId));
}

/** Son carnet, côté Rencontre : visible, avec instruments et mêmes jams déclarées (D81). */
export async function myNetwork(ownerId: string, now = new Date()) {
	const ties = await prisma.savedContact.findMany({
		where: { ownerId, contact: { ...publicActorWhere(now, ownerId), person: { isNot: null } } },
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
			opportunity: { attendances: { some: { actorId: ownerId, attendedAt: { not: null } } } }
		},
		_count: { _all: true }
	});
	// Un contact gardé d'un seul côté ne révèle pas ses jams (D81).
	const sharing = await visibleOwnerIds(
		ownerId,
		shared.map((s) => s.actorId),
		{ scope: 'past', now }
	);
	const jamsWith = new Map(
		shared.filter((s) => sharing.has(s.actorId)).map((s) => [s.actorId, s._count._all])
	);
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
		prisma.savedContact.findMany({
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
