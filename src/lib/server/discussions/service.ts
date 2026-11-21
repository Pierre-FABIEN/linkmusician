/**
 * Discussions de groupe (P3-16c, D46), seul point d'écriture de
 * `GroupDiscussion`, `GroupDiscussionMember` et `GroupDiscussionMessage`.
 * Règles pures : `#lib/discussions/rules`.
 *
 * - On ouvre une discussion depuis un de ses **groupes de contacts** : chaque
 *   personne du groupe qui peut l'être reçoit une **invitation** et ne voit
 *   rien avant de l'avoir acceptée. Les autres sont écartées sans bruit
 *   (mineur·e, blocage : la raison n'est jamais dite).
 * - Seul l'auteur invite, et seulement des personnes de son carnet avec qui
 * il a une conversation acceptée (`isReachableContact`, D82) : enregistrer
 * un·e inconnu·e ne suffit pas à l'inviter.
 * - Pas de « Rejoindre » si un blocage existe avec une personne présente.
 * - Messages en texte brut (mêmes règles que la messagerie à deux).
 */
import { prisma } from '#lib/server';
import { qualifiedTable } from '#lib/server/db-schema';
import { isIndexable } from '#lib/actors/visibility';
import { isReachableContact } from '#lib/server/contacts/service';
import { notify } from '#lib/server/notifications/service';
import { MESSAGE_ERRORS, checkMessage, preview } from '#lib/messaging/rules';
import {
	INVITE_ERRORS,
	JOIN_ERRORS,
	MAX_DISCUSSIONS_CREATED,
	MAX_DISCUSSION_MEMBERS,
	accessOf,
	canPost,
	inviteRefusal,
	joinRefusal,
	membersSummary,
	type MemberState
} from '#lib/discussions/rules';

export class DiscussionError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

/** Messages lus au plus par ouverture (les plus récents). */
const THREAD_LIMIT = 100;
const SEATED = { in: ['INVITED', 'ACTIVE'] as MemberState[] };

const href = (id: string) => `/messages/groupes/${id}`;

async function isAdult(actorId: string, now: Date) {
	const person = await prisma.person.findUnique({
		where: { actorId },
		select: { birthDate: true }
	});
	return !!person && isIndexable(person.birthDate, now);
}

/** Un blocage, dans un sens ou l'autre, entre `actorId` et l'une de `others`. */
async function blockedWithAny(actorId: string, others: string[]) {
	if (others.length === 0) return false;
	const count = await prisma.block.count({
		where: {
			OR: [
				{ blockerActorId: actorId, blockedActorId: { in: others } },
				{ blockedActorId: actorId, blockerActorId: { in: others } }
			]
		}
	});
	return count > 0;
}

async function seatOf(actorId: string, discussionId: string) {
	const discussion = await prisma.groupDiscussion.findUnique({
		where: { id: discussionId },
		select: {
			id: true,
			title: true,
			creatorId: true,
			members: { where: { actorId }, select: { state: true } }
		}
	});
	if (!discussion) throw new DiscussionError('Discussion introuvable.', 404);
	const state = (discussion.members[0]?.state ?? null) as MemberState | null;
	return { discussion, state };
}

/** Vérifie une invitation et renvoie la raison d'un refus, ou `null`. */
async function checkInvite(
	inviterId: string,
	creatorId: string,
	inviterState: MemberState | null,
	inviteeId: string,
	inviteeState: MemberState | null,
	seats: number,
	now: Date
) {
	const [contact, adult, blocked] = await Promise.all([
		isReachableContact(inviterId, inviteeId, now),
		isAdult(inviteeId, now),
		blockedWithAny(inviterId, [inviteeId])
	]);
	return inviteRefusal({
		inviterIsCreator: inviterId === creatorId,
		inviterState,
		isContact: contact,
		inviteeIsAdult: adult,
		blockedWithInviter: blocked,
		inviteeState,
		seats
	});
}

/**
 * Ouvrir une discussion depuis un de ses groupes de contacts : l'auteur y
 * entre, chaque personne qui peut l'être est invitée.
 */
export async function openFromContactGroup(creatorId: string, groupId: string, now = new Date()) {
	const group = await prisma.contactGroup.findFirst({
		where: { id: groupId, ownerId: creatorId },
		select: { id: true, name: true, members: { select: { contactId: true } } }
	});
	if (!group) throw new DiscussionError('Ce groupe n’existe plus.', 404);
	if (!(await isAdult(creatorId, now))) {
		throw new DiscussionError('Les discussions de groupe ne sont pas encore ouvertes pour toi.');
	}
	if ((await prisma.groupDiscussion.count({ where: { creatorId } })) >= MAX_DISCUSSIONS_CREATED) {
		throw new DiscussionError(`${MAX_DISCUSSIONS_CREATED} discussions de groupe au plus.`);
	}
	const invitees: string[] = [];
	for (const { contactId } of group.members) {
		if (invitees.length + 1 >= MAX_DISCUSSION_MEMBERS) break;
		const refusal = await checkInvite(
			creatorId,
			creatorId,
			'ACTIVE',
			contactId,
			null,
			invitees.length + 1,
			now
		);
		if (refusal === null) invitees.push(contactId);
	}
	if (invitees.length === 0) {
		throw new DiscussionError(
			'Personne de ce groupe ne peut être invité·e pour l’instant. Ajoute des contacts au groupe.'
		);
	}
	const discussion = await prisma.$transaction(async (tx) => {
		const created = await tx.groupDiscussion.create({
			data: {
				title: group.name,
				creatorId,
				contactGroupId: group.id,
				lastMessageAt: now,
				createdAt: now,
				members: {
					create: [
						{ actorId: creatorId, state: 'ACTIVE', joinedAt: now, lastReadAt: now },
						...invitees.map((actorId) => ({ actorId, state: 'INVITED' as const }))
					]
				}
			},
			select: { id: true }
		});
		for (const recipientId of invitees) {
			await notify(tx, {
				recipientId,
				type: 'GROUP_DISCUSSION_INVITE',
				fromActorId: creatorId,
				href: href(created.id),
				title: group.name
			});
		}
		return created;
	});
	return {
		id: discussion.id,
		invited: invitees.length,
		skipped: group.members.length - invitees.length
	};
}

/** L'auteur invite un de ses contacts (par son identifiant). */
export async function inviteToDiscussion(
	inviterId: string,
	discussionId: string,
	handle: string,
	now = new Date()
) {
	const { discussion, state } = await seatOf(inviterId, discussionId);
	const invitee = await prisma.actor.findFirst({
		where: { handle: handle.trim().replace(/^@/, '').toLowerCase(), kind: 'PERSON' },
		select: { id: true, displayName: true }
	});
	if (!invitee) throw new DiscussionError(INVITE_ERRORS.not_contact);
	const [existing, seats] = await Promise.all([
		prisma.groupDiscussionMember.findUnique({
			where: { discussionId_actorId: { discussionId, actorId: invitee.id } },
			select: { state: true }
		}),
		prisma.groupDiscussionMember.count({ where: { discussionId, state: SEATED } })
	]);
	const refusal = await checkInvite(
		inviterId,
		discussion.creatorId,
		state,
		invitee.id,
		(existing?.state ?? null) as MemberState | null,
		seats,
		now
	);
	if (refusal) throw new DiscussionError(INVITE_ERRORS[refusal]);
	await prisma.$transaction(async (tx) => {
		await tx.groupDiscussionMember.create({
			data: { discussionId, actorId: invitee.id, state: 'INVITED', invitedAt: now }
		});
		await notify(tx, {
			recipientId: invitee.id,
			type: 'GROUP_DISCUSSION_INVITE',
			fromActorId: inviterId,
			href: href(discussionId),
			title: discussion.title
		});
	});
	return invitee;
}

/** Rejoindre : pas si un blocage existe avec une personne déjà présente. */
export async function joinDiscussion(actorId: string, discussionId: string, now = new Date()) {
	const { state } = await seatOf(actorId, discussionId);
	const present = await prisma.groupDiscussionMember.findMany({
		where: { discussionId, state: 'ACTIVE' },
		select: { actorId: true }
	});
	const [adult, blocked] = await Promise.all([
		isAdult(actorId, now),
		blockedWithAny(
			actorId,
			present.map((p) => p.actorId)
		)
	]);
	const refusal = joinRefusal({ state, isAdult: adult, blockedWithAMember: blocked });
	if (refusal) throw new DiscussionError(JOIN_ERRORS[refusal]);
	await prisma.groupDiscussionMember.update({
		where: { discussionId_actorId: { discussionId, actorId } },
		data: { state: 'ACTIVE', joinedAt: now, lastReadAt: now }
	});
	// L'invitation sous la cloche est réglée.
	await prisma.notification.updateMany({
		where: {
			recipientActorId: actorId,
			type: 'GROUP_DISCUSSION_INVITE',
			href: href(discussionId),
			readAt: null
		},
		data: { readAt: now }
	});
}

/** « Non merci » : définitif pour cette discussion, sans prévenir personne. */
export async function declineDiscussion(actorId: string, discussionId: string, now = new Date()) {
	const { state } = await seatOf(actorId, discussionId);
	if (state !== 'INVITED') throw new DiscussionError(JOIN_ERRORS.not_invited);
	await prisma.groupDiscussionMember.update({
		where: { discussionId_actorId: { discussionId, actorId } },
		data: { state: 'DECLINED', leftAt: now }
	});
	await prisma.notification.updateMany({
		where: {
			recipientActorId: actorId,
			type: 'GROUP_DISCUSSION_INVITE',
			href: href(discussionId),
			readAt: null
		},
		data: { readAt: now }
	});
}

/** Quitter : on ne voit plus rien, ses messages restent. */
export async function leaveDiscussion(actorId: string, discussionId: string, now = new Date()) {
	const { state } = await seatOf(actorId, discussionId);
	if (state !== 'ACTIVE') throw new DiscussionError('Tu ne fais pas partie de cette discussion.');
	await prisma.groupDiscussionMember.update({
		where: { discussionId_actorId: { discussionId, actorId } },
		data: { state: 'LEFT', leftAt: now }
	});
}

export async function postToDiscussion(
	actorId: string,
	discussionId: string,
	raw: string,
	now = new Date()
) {
	const { state } = await seatOf(actorId, discussionId);
	if (!canPost(state)) throw new DiscussionError('Tu ne fais pas partie de cette discussion.');
	const result = checkMessage(raw);
	if (!result.ok) throw new DiscussionError(MESSAGE_ERRORS[result.reason]);
	await prisma.$transaction([
		prisma.groupDiscussionMessage.create({
			data: { discussionId, senderActorId: actorId, body: result.body, createdAt: now }
		}),
		prisma.groupDiscussion.update({ where: { id: discussionId }, data: { lastMessageAt: now } }),
		prisma.groupDiscussionMember.update({
			where: { discussionId_actorId: { discussionId, actorId } },
			data: { lastReadAt: now }
		})
	]);
}

const personRef = { select: { id: true, handle: true, displayName: true, deletedAt: true } };
const shown = (a: { handle: string; displayName: string; deletedAt: Date | null }) => ({
	handle: a.deletedAt ? null : a.handle,
	displayName: a.displayName
});

/**
 * Une discussion telle que la personne la voit : l'invitation seule (titre,
 * auteur, qui est là) tant qu'elle n'a pas rejoint ; le fil ensuite, marqué
 * comme lu. Introuvable pour qui n'y est pas (ou plus).
 */
export async function openDiscussion(actorId: string, discussionId: string, now = new Date()) {
	const discussion = await prisma.groupDiscussion.findUnique({
		where: { id: discussionId },
		select: {
			id: true,
			title: true,
			creatorId: true,
			creator: personRef,
			members: {
				where: { state: SEATED },
				orderBy: { invitedAt: 'asc' },
				select: { actorId: true, state: true, lastReadAt: true, actor: personRef }
			}
		}
	});
	const me = discussion?.members.find((m) => m.actorId === actorId);
	const access = accessOf((me?.state ?? null) as MemberState | null);
	if (!discussion || !me || access === 'none') {
		throw new DiscussionError('Discussion introuvable.', 404);
	}
	const present = discussion.members.filter((m) => m.state === 'ACTIVE');
	const others = present.filter((m) => m.actorId !== actorId).map((m) => m.actor.displayName);
	const base = {
		id: discussion.id,
		title: discussion.title,
		creator: shown(discussion.creator),
		iAmCreator: discussion.creatorId === actorId
	};
	if (access === 'invitation') {
		return {
			...base,
			access: 'invitation' as const,
			summary: membersSummary(present.map((m) => m.actor.displayName))
		};
	}

	const messages = await prisma.groupDiscussionMessage.findMany({
		where: { discussionId },
		orderBy: { createdAt: 'desc' },
		take: THREAD_LIMIT,
		select: { id: true, senderActorId: true, body: true, createdAt: true, sender: personRef }
	});
	const newest = messages.find((m) => m.senderActorId !== actorId);
	if (newest && (!me.lastReadAt || newest.createdAt > me.lastReadAt)) {
		await prisma.groupDiscussionMember.update({
			where: { discussionId_actorId: { discussionId, actorId } },
			data: { lastReadAt: now }
		});
	}
	return {
		...base,
		access: 'member' as const,
		summary: membersSummary(others),
		latestAt: messages[0]?.createdAt.toISOString() ?? null,
		members: present.map((m) => ({ id: m.actorId, ...shown(m.actor) })),
		invited: discussion.members
			.filter((m) => m.state === 'INVITED')
			.map((m) => ({ id: m.actorId, ...shown(m.actor) })),
		messages: messages.reverse().map((m) => ({
			id: m.id,
			mine: m.senderActorId === actorId,
			from: shown(m.sender),
			body: m.body,
			createdAt: m.createdAt
		}))
	};
}
export type DiscussionView = Awaited<ReturnType<typeof openDiscussion>>;

/** Contacts que l'auteur peut encore inviter (pas déjà dans la discussion). */
export async function invitableContacts(
	creatorId: string,
	discussionId: string,
	contacts: { id: string; handle: string; displayName: string }[]
) {
	const seats = await prisma.groupDiscussionMember.findMany({
		where: { discussionId },
		select: { actorId: true }
	});
	const taken = new Set(seats.map((s) => s.actorId));
	return contacts.filter((c) => c.id !== creatorId && !taken.has(c.id));
}

/** Ses discussions : invitations en attente et discussions où l'on est. */
export async function listDiscussions(actorId: string) {
	const seats = await prisma.groupDiscussionMember.findMany({
		where: { actorId, state: SEATED },
		orderBy: { discussion: { lastMessageAt: 'desc' } },
		take: 100,
		select: {
			state: true,
			discussion: {
				select: {
					id: true,
					title: true,
					lastMessageAt: true,
					creator: { select: { displayName: true } },
					members: {
						where: { state: 'ACTIVE', actorId: { not: actorId } },
						select: { actor: { select: { displayName: true } } }
					},
					messages: {
						orderBy: { createdAt: 'desc' },
						take: 1,
						select: { body: true, senderActorId: true, sender: { select: { displayName: true } } }
					}
				}
			}
		}
	});
	const unread = await unreadByDiscussion(actorId);
	return seats.map(({ state, discussion: d }) => {
		const invitation = state === 'INVITED';
		const last = d.messages[0];
		return {
			id: d.id,
			title: d.title,
			invitation,
			creator: d.creator.displayName,
			summary: membersSummary(d.members.map((m) => m.actor.displayName)),
			lastMessageAt: d.lastMessageAt,
			// Rien du fil avant d'avoir rejoint.
			preview:
				invitation || !last
					? ''
					: `${last.senderActorId === actorId ? 'Toi' : last.sender.displayName} : ${preview(last.body)}`,
			unread: invitation ? 0 : (unread.get(d.id) ?? 0)
		};
	});
}

/** Non-lus par discussion : messages des autres après ma lecture. */
async function unreadByDiscussion(actorId: string) {
	const rows = await prisma.$queryRaw<{ discussionId: string; n: number }[]>`
		SELECT m."discussionId", COUNT(*)::int AS n
		FROM ${qualifiedTable('group_discussion_messages')} m
		JOIN ${qualifiedTable('group_discussion_members')} gm
			ON gm."discussionId" = m."discussionId" AND gm."actorId" = ${actorId}
		WHERE m."senderActorId" <> ${actorId}
			AND gm.state::text = 'ACTIVE'
			AND m."createdAt" > COALESCE(gm."lastReadAt", gm."joinedAt", 'epoch'::timestamp)
		GROUP BY m."discussionId"`;
	return new Map(rows.map((r) => [r.discussionId, r.n]));
}

/** Pour la pastille de Messages : non-lus et invitations en attente. */
export async function discussionsUnreadTotal(actorId: string): Promise<number> {
	const [byDiscussion, invitations] = await Promise.all([
		unreadByDiscussion(actorId),
		prisma.groupDiscussionMember.count({ where: { actorId, state: 'INVITED' } })
	]);
	return [...byDiscussion.values()].reduce((sum, n) => sum + n, 0) + invitations;
}

/**
 * Rafraîchissement léger (D8) : un message plus récent que `since` ? Une
 * lecture, aucune écriture. `null` si la personne n'est pas présente.
 */
export async function hasNewInDiscussionSince(
	actorId: string,
	discussionId: string,
	since: Date | null
): Promise<boolean | null> {
	const rows = await prisma.$queryRaw<{ member: boolean; fresh: boolean }[]>`
		SELECT
			EXISTS (SELECT 1 FROM ${qualifiedTable('group_discussion_members')}
				WHERE "discussionId" = ${discussionId} AND "actorId" = ${actorId}
				AND state::text = 'ACTIVE') AS member,
			EXISTS (SELECT 1 FROM ${qualifiedTable('group_discussion_messages')}
				WHERE "discussionId" = ${discussionId}
				AND "createdAt" > ${since ?? new Date(0)}) AS fresh`;
	const row = rows[0];
	return row?.member ? row.fresh : null;
}

/** Export RGPD : ses discussions de groupe et les messages qu'on y a écrits. */
export async function discussionsExport(actorId: string) {
	const [seats, messages] = await Promise.all([
		prisma.groupDiscussionMember.findMany({
			where: { actorId },
			select: {
				state: true,
				invitedAt: true,
				joinedAt: true,
				leftAt: true,
				discussion: { select: { title: true, creatorId: true } }
			}
		}),
		prisma.groupDiscussionMessage.findMany({
			where: { senderActorId: actorId },
			orderBy: { createdAt: 'asc' },
			select: { body: true, createdAt: true, discussion: { select: { title: true } } }
		})
	]);
	return {
		discussions: seats.map((s) => ({
			titre: s.discussion.title,
			ouverte_par_moi: s.discussion.creatorId === actorId,
			statut: s.state,
			invite_le: s.invitedAt,
			rejoint_le: s.joinedAt,
			quitte_le: s.leftAt
		})),
		messages: messages.map((m) => ({
			discussion: m.discussion.title,
			texte: m.body,
			le: m.createdAt
		}))
	};
}
