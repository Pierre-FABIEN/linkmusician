/**
 * Messagerie (P2-04) : demandes, conversations, messages, non-lus. Règles
 * pures dans `#lib/messaging/rules`. Le client n'envoie que des intentions
 * (écrire, accepter, refuser) ; l'XP éventuelle passe par le moteur.
 */
import { prisma } from '#lib/server';
import { qualifiedTable } from '#lib/server/db-schema';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { consumeDailyQuota } from '#lib/server/trust/quotas';
import { emitAndProcess } from '#lib/server/progression/processor';
import {
	MESSAGE_ERRORS,
	canReceiveRequest,
	checkMessage,
	pairKey,
	preview,
	sendPermission,
	type ParticipantState
} from '#lib/messaging/rules';

export class MessagingError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

/** Messages lus au plus par ouverture (les plus récents). */
const THREAD_LIMIT = 100;

function checked(raw: string) {
	const result = checkMessage(raw);
	if (!result.ok) throw new MessagingError(MESSAGE_ERRORS[result.reason]);
	return result.body;
}

/** Conversation directe existante entre deux acteurs, ou `null`. */
export async function findConversationWith(actorId: string, otherId: string) {
	return prisma.conversation.findUnique({
		where: { pairKey: pairKey(actorId, otherId) },
		select: { id: true }
	});
}

/**
 * Premier message à quelqu'un : une demande. Si la paire a déjà une
 * conversation, on la renvoie sans rien créer.
 */
export async function startConversation(senderId: string, recipientHandle: string, raw: string) {
	const recipient = await prisma.actor.findFirst({
		where: { handle: recipientHandle, ...publicActorWhere(), person: { isNot: null } },
		select: { id: true, person: { select: { birthDate: true } } }
	});
	if (!recipient) throw new MessagingError('Profil introuvable.', 404);
	if (recipient.id === senderId) throw new MessagingError('Tu ne peux pas t’écrire à toi-même.');

	const existing = await findConversationWith(senderId, recipient.id);
	if (existing) return { id: existing.id, created: false };

	if (!canReceiveRequest(recipient.person?.birthDate)) {
		// Jamais la raison (l'âge n'est pas révélé).
		throw new MessagingError('Cette personne ne reçoit pas de nouvelles demandes pour l’instant.');
	}
	const body = checked(raw);
	if (!(await consumeDailyQuota(senderId, 'dailyFirstMessages'))) {
		throw new MessagingError(
			'Tu as atteint ton nombre de premiers messages pour aujourd’hui. Il augmente avec ta confiance.',
			429
		);
	}
	const now = new Date();
	const conversation = await prisma.conversation.create({
		data: {
			pairKey: pairKey(senderId, recipient.id),
			initiatorId: senderId,
			lastMessageAt: now,
			participants: {
				create: [
					{ actorId: senderId, state: 'ACCEPTED', lastReadAt: now },
					{ actorId: recipient.id, state: 'REQUEST' }
				]
			},
			messages: { create: { senderActorId: senderId, body, createdAt: now } }
		},
		select: { id: true }
	});
	return { id: conversation.id, created: true };
}

async function loadParticipants(actorId: string, conversationId: string) {
	const conversation = await prisma.conversation.findUnique({
		where: { id: conversationId },
		select: {
			id: true,
			initiatorId: true,
			opportunityId: true,
			reciprocatedAt: true,
			participants: { select: { actorId: true, state: true, lastReadAt: true } }
		}
	});
	const me = conversation?.participants.find((p) => p.actorId === actorId);
	const other = conversation?.participants.find((p) => p.actorId !== actorId);
	if (!conversation || !me || !other) throw new MessagingError('Conversation introuvable.', 404);
	return { conversation, me, other };
}

/** Accepter ou refuser une demande reçue. */
export async function respondToRequest(actorId: string, conversationId: string, accept: boolean) {
	const { me } = await loadParticipants(actorId, conversationId);
	if (me.state !== 'REQUEST') return;
	await prisma.conversationParticipant.update({
		where: { conversationId_actorId: { conversationId, actorId } },
		data: { state: accept ? 'ACCEPTED' : 'DECLINED', lastReadAt: new Date() }
	});
}

export async function sendMessage(actorId: string, conversationId: string, raw: string) {
	const { conversation, me, other } = await loadParticipants(actorId, conversationId);
	const mySentCount = await prisma.message.count({
		where: { conversationId, senderActorId: actorId }
	});
	const permission = sendPermission({
		myState: me.state as ParticipantState,
		otherState: other.state as ParticipantState,
		mySentCount
	});
	if (permission === 'must_accept') throw new MessagingError('Accepte d’abord la demande.');
	if (permission === 'pending') {
		throw new MessagingError('Ta demande attend une réponse : un seul message en attendant.');
	}
	if (permission === 'declined') throw new MessagingError('Cette conversation est fermée.');
	const body = checked(raw);
	const now = new Date();
	const firstReply = conversation.initiatorId !== actorId && conversation.reciprocatedAt === null;

	await prisma.$transaction(async (tx) => {
		await tx.message.create({
			data: { conversationId, senderActorId: actorId, body, createdAt: now }
		});
		await tx.conversation.update({
			where: { id: conversationId },
			data: { lastMessageAt: now, ...(firstReply ? { reciprocatedAt: now } : {}) }
		});
		await tx.conversationParticipant.update({
			where: { conversationId_actorId: { conversationId, actorId } },
			data: { lastReadAt: now }
		});
		if (firstReply) {
			// Échange réciproque : un événement par personne (la règle crédite
			// l'acteur de l'événement, et seulement si la conversation est née
			// d'une annonce).
			const fromOpportunity = conversation.opportunityId !== null;
			for (const [a, b] of [
				[conversation.initiatorId, actorId],
				[actorId, conversation.initiatorId]
			]) {
				await emitAndProcess(tx, {
					type: 'conversation.reciprocated',
					actorId: a,
					counterpartId: b,
					fromOpportunity
				});
			}
		}
	});
}

/** Fil d'une conversation (les plus récents), marqué comme lu. */
export async function openConversation(actorId: string, conversationId: string) {
	const { me, other } = await loadParticipants(actorId, conversationId);
	const [otherActor, messages, mySentCount] = await Promise.all([
		prisma.actor.findUniqueOrThrow({
			where: { id: other.actorId },
			select: { handle: true, displayName: true, deletedAt: true }
		}),
		prisma.message.findMany({
			where: { conversationId },
			orderBy: { createdAt: 'desc' },
			take: THREAD_LIMIT,
			select: { id: true, senderActorId: true, body: true, createdAt: true }
		}),
		prisma.message.count({ where: { conversationId, senderActorId: actorId } })
	]);
	await prisma.conversationParticipant.update({
		where: { conversationId_actorId: { conversationId, actorId } },
		data: { lastReadAt: new Date() }
	});
	return {
		id: conversationId,
		other: {
			handle: otherActor.deletedAt ? null : otherActor.handle,
			displayName: otherActor.displayName
		},
		myState: me.state as ParticipantState,
		permission: sendPermission({
			myState: me.state as ParticipantState,
			otherState: other.state as ParticipantState,
			mySentCount
		}),
		messages: messages.reverse().map((m) => ({
			id: m.id,
			mine: m.senderActorId === actorId,
			body: m.body,
			createdAt: m.createdAt
		}))
	};
}

/** Conversations d'une personne, la plus récente d'abord, avec non-lus. */
export async function listConversations(actorId: string) {
	const mine = await prisma.conversationParticipant.findMany({
		where: { actorId },
		orderBy: { conversation: { lastMessageAt: 'desc' } },
		take: 100,
		select: {
			state: true,
			lastReadAt: true,
			conversation: {
				select: {
					id: true,
					lastMessageAt: true,
					participants: {
						where: { actorId: { not: actorId } },
						select: {
							state: true,
							actor: { select: { handle: true, displayName: true, deletedAt: true } }
						}
					},
					messages: {
						orderBy: { createdAt: 'desc' },
						take: 1,
						select: { body: true, senderActorId: true }
					}
				}
			}
		}
	});
	const unread = await unreadByConversation(actorId);
	return mine.flatMap(({ state, conversation }) => {
		const other = conversation.participants[0];
		if (!other) return [];
		const last = conversation.messages[0];
		return [
			{
				id: conversation.id,
				displayName: other.actor.displayName,
				handle: other.actor.deletedAt ? null : other.actor.handle,
				myState: state as ParticipantState,
				otherState: other.state as ParticipantState,
				lastMessageAt: conversation.lastMessageAt,
				preview: last ? preview(last.body) : '',
				lastIsMine: last?.senderActorId === actorId,
				unread: unread.get(conversation.id) ?? 0
			}
		];
	});
}

/** Messages non lus par conversation (ceux de l'autre, après ma lecture). */
async function unreadByConversation(actorId: string) {
	const rows = await prisma.$queryRaw<{ conversationId: string; n: number }[]>`
		SELECT m."conversationId", COUNT(*)::int AS n
		FROM ${qualifiedTable('messages')} m
		JOIN ${qualifiedTable('conversation_participants')} cp
			ON cp."conversationId" = m."conversationId" AND cp."actorId" = ${actorId}
		WHERE m."senderActorId" <> ${actorId}
			AND cp.state::text <> 'DECLINED'
			AND m."createdAt" > COALESCE(cp."lastReadAt", 'epoch'::timestamp)
		GROUP BY m."conversationId"`;
	return new Map(rows.map((r) => [r.conversationId, r.n]));
}

/** Total pour le badge de la navigation : messages non lus et demandes reçues. */
export async function unreadTotal(actorId: string): Promise<number> {
	const byConversation = await unreadByConversation(actorId);
	return [...byConversation.values()].reduce((sum, n) => sum + n, 0);
}
