/**
 * Contacts (P3-16b, D45, D46), seul point d'écriture de `ContactGroup` et
 * `ContactGroupMember`. Règles pures : `#lib/contacts/rules`.
 *
 * - Les **contacts** d'une personne : son carnet (`MusicalTie`, « Garder le
 *   contact » après avoir joué ensemble) et les personnes avec qui elle a
 *   une conversation ouverte des deux côtés. Jamais un profil masqué,
 *   suspendu ou séparé par un blocage (`publicActorWhere`).
 * - Pour chacun : comment on s'est rencontrés (jams, collaborations) et les
 *   projets partagés (groupes, morceaux crédités des deux côtés).
 * - Les **groupes de contacts** sont privés et ne contiennent que des
 *   contacts. Ils ouvriront une discussion de groupe (P3-16c).
 */
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import {
	compareContacts,
	groupNameSchema,
	howWeMet,
	MAX_CONTACT_GROUPS,
	MAX_GROUP_MEMBERS
} from '#lib/contacts/rules';

export class ContactError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

const present = { attendedAt: { not: null }, removedAt: null } as const;

/** Identifiants des contacts (carnet et conversations ouvertes). */
async function contactIdsOf(ownerId: string, now: Date) {
	const [ties, conversations] = await Promise.all([
		prisma.musicalTie.findMany({
			where: { ownerId, contact: publicActorWhere(now, ownerId) },
			select: { contactId: true }
		}),
		prisma.conversation.findMany({
			where: {
				participants: { some: { actorId: ownerId } },
				NOT: { participants: { some: { state: { not: 'ACCEPTED' } } } }
			},
			select: { id: true, participants: { select: { actorId: true } } }
		})
	]);
	const carnet = new Set(ties.map((t) => t.contactId));
	const conversationWith = new Map<string, string>();
	for (const c of conversations) {
		for (const p of c.participants)
			if (p.actorId !== ownerId) conversationWith.set(p.actorId, c.id);
	}
	// Les conversations : seulement des profils visibles.
	const others = [...conversationWith.keys()].filter((id) => !carnet.has(id));
	const visible = others.length
		? await prisma.actor.findMany({
				where: { id: { in: others }, kind: 'PERSON', ...publicActorWhere(now, ownerId) },
				select: { id: true }
			})
		: [];
	const ids = new Set([...carnet, ...visible.map((v) => v.id)]);
	return { ids, carnet, conversationWith };
}

/** Est-ce un contact de la personne ? */
export async function isContact(ownerId: string, contactId: string, now = new Date()) {
	return (await contactIdsOf(ownerId, now)).ids.has(contactId);
}

/** Le carnet : chaque contact, comment on s'est rencontrés, ce qu'on partage. */
export async function myContacts(ownerId: string, now = new Date()) {
	const { ids, carnet, conversationWith } = await contactIdsOf(ownerId, now);
	const list = [...ids];
	if (list.length === 0) return [];
	const [actors, jams, collabs, myBands, myWorks, groups] = await Promise.all([
		prisma.actor.findMany({
			where: { id: { in: list } },
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
		}),
		prisma.jamAttendance.findMany({
			where: {
				actorId: { in: list },
				...present,
				opportunity: { attendances: { some: { actorId: ownerId, ...present } } }
			},
			select: { actorId: true, opportunity: { select: { startsAt: true } } }
		}),
		prisma.collaborationParticipant.findMany({
			where: {
				actorId: { in: list },
				collaboration: { status: 'COMPLETED', participants: { some: { actorId: ownerId } } }
			},
			select: { actorId: true, collaboration: { select: { happenedOn: true } } }
		}),
		prisma.membership.findMany({
			where: { personId: ownerId, status: 'ACTIVE', org: { kind: 'BAND', dissolvedAt: null } },
			select: {
				orgId: true,
				org: {
					select: {
						actor: { select: { handle: true, displayName: true } },
						memberships: {
							where: { personId: { in: list }, status: 'ACTIVE' },
							select: { personId: true }
						}
					}
				}
			}
		}),
		prisma.workContributor.findMany({
			where: { personId: ownerId, confirmedAt: { not: null } },
			select: {
				work: {
					select: {
						contributors: {
							where: { personId: { in: list }, confirmedAt: { not: null } },
							select: { personId: true }
						}
					}
				}
			}
		}),
		prisma.contactGroupMember.findMany({
			where: { contactId: { in: list }, group: { ownerId } },
			select: { contactId: true, group: { select: { id: true, name: true } } }
		})
	]);

	const byId = <T>() => new Map<string, T[]>();
	const jamDates = byId<Date>();
	for (const j of jams) {
		const at = j.opportunity.startsAt;
		if (at) jamDates.set(j.actorId, [...(jamDates.get(j.actorId) ?? []), at]);
	}
	const collabDates = byId<Date>();
	for (const c of collabs) {
		collabDates.set(c.actorId, [...(collabDates.get(c.actorId) ?? []), c.collaboration.happenedOn]);
	}
	const bands = byId<{ handle: string; name: string }>();
	for (const b of myBands) {
		for (const m of b.org.memberships) {
			bands.set(m.personId, [
				...(bands.get(m.personId) ?? []),
				{ handle: b.org.actor.handle, name: b.org.actor.displayName }
			]);
		}
	}
	const works = new Map<string, number>();
	for (const w of myWorks) {
		for (const c of w.work.contributors) works.set(c.personId, (works.get(c.personId) ?? 0) + 1);
	}
	const inGroups = byId<{ id: string; name: string }>();
	for (const g of groups)
		inGroups.set(g.contactId, [...(inGroups.get(g.contactId) ?? []), g.group]);

	return actors
		.map((a) => {
			const dates = [...(jamDates.get(a.id) ?? []), ...(collabDates.get(a.id) ?? [])];
			const lastTogether = dates.length
				? new Date(Math.max(...dates.map((d) => d.getTime())))
				: null;
			const inCarnet = carnet.has(a.id);
			return {
				id: a.id,
				handle: a.handle,
				displayName: a.displayName,
				instruments: a.person?.instruments.map((i) => i.instrument.name) ?? [],
				inCarnet,
				howWeMet: howWeMet({
					jamsTogether: jamDates.get(a.id)?.length ?? 0,
					collaborations: collabDates.get(a.id)?.length ?? 0,
					inCarnet
				}),
				lastTogether,
				bands: bands.get(a.id) ?? [],
				works: works.get(a.id) ?? 0,
				groups: inGroups.get(a.id) ?? [],
				conversationId: conversationWith.get(a.id) ?? null
			};
		})
		.sort(compareContacts);
}
export type Contact = Awaited<ReturnType<typeof myContacts>>[number];

// ─── Groupes de contacts ─────────────────────────────────────────────────

async function ownGroup(ownerId: string, groupId: string) {
	const group = await prisma.contactGroup.findFirst({
		where: { id: groupId, ownerId },
		select: { id: true, _count: { select: { members: true } } }
	});
	if (!group) throw new ContactError('Ce groupe n’existe plus.', 404);
	return group;
}

function parseName(raw: string) {
	const parsed = groupNameSchema.safeParse(raw);
	if (!parsed.success) throw new ContactError(parsed.error.issues[0]?.message ?? 'Nom invalide.');
	return parsed.data;
}

export async function createContactGroup(ownerId: string, rawName: string) {
	const name = parseName(rawName);
	if ((await prisma.contactGroup.count({ where: { ownerId } })) >= MAX_CONTACT_GROUPS) {
		throw new ContactError(`${MAX_CONTACT_GROUPS} groupes au plus.`);
	}
	return prisma.contactGroup.create({ data: { ownerId, name }, select: { id: true, name: true } });
}

export async function renameContactGroup(ownerId: string, groupId: string, rawName: string) {
	const name = parseName(rawName);
	await ownGroup(ownerId, groupId);
	await prisma.contactGroup.update({ where: { id: groupId }, data: { name } });
}

export async function deleteContactGroup(ownerId: string, groupId: string) {
	await ownGroup(ownerId, groupId);
	await prisma.contactGroup.delete({ where: { id: groupId } });
}

/** Ajouter un contact (par son identifiant) à un de ses groupes. */
export async function addToContactGroup(
	ownerId: string,
	groupId: string,
	handle: string,
	now = new Date()
) {
	const group = await ownGroup(ownerId, groupId);
	const contact = await prisma.actor.findFirst({
		where: { handle: handle.trim().replace(/^@/, '').toLowerCase(), kind: 'PERSON' },
		select: { id: true, displayName: true }
	});
	if (!contact || !(await isContact(ownerId, contact.id, now))) {
		throw new ContactError('On ne met dans un groupe que ses contacts.');
	}
	if (group._count.members >= MAX_GROUP_MEMBERS) {
		throw new ContactError(`${MAX_GROUP_MEMBERS} personnes au plus par groupe.`);
	}
	await prisma.contactGroupMember.upsert({
		where: { groupId_contactId: { groupId, contactId: contact.id } },
		create: { groupId, contactId: contact.id },
		update: {}
	});
	return contact;
}

export async function removeFromContactGroup(ownerId: string, groupId: string, contactId: string) {
	await ownGroup(ownerId, groupId);
	await prisma.contactGroupMember.deleteMany({ where: { groupId, contactId } });
}

/** Ses groupes, avec leurs membres encore visibles. */
export async function myContactGroups(ownerId: string, now = new Date()) {
	const groups = await prisma.contactGroup.findMany({
		where: { ownerId },
		orderBy: { createdAt: 'asc' },
		select: {
			id: true,
			name: true,
			members: {
				where: { contact: publicActorWhere(now, ownerId) },
				orderBy: { addedAt: 'asc' },
				select: { contact: { select: { id: true, handle: true, displayName: true } } }
			}
		}
	});
	return groups.map((g) => ({ id: g.id, name: g.name, members: g.members.map((m) => m.contact) }));
}
export type ContactGroupView = Awaited<ReturnType<typeof myContactGroups>>[number];

/** Export RGPD : ses groupes de contacts. */
export async function contactGroupsExport(ownerId: string) {
	const groups = await prisma.contactGroup.findMany({
		where: { ownerId },
		select: {
			name: true,
			createdAt: true,
			members: { select: { contact: { select: { displayName: true } } } }
		}
	});
	return groups.map((g) => ({
		nom: g.name,
		cree_le: g.createdAt,
		membres: g.members.map((m) => m.contact.displayName)
	}));
}
