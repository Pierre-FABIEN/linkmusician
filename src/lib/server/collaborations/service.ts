/**
 * Collaborations (P2-06) : proposer à un contact (conversation acceptée),
 * répondre, confirmer, annuler. Quand chaque participant a confirmé :
 * `collaboration.completed`, traité par le moteur dans la même transaction
 * (400 XP × multiplicateurs : rendement décroissant par contrepartie,
 * confiance de la contrepartie). Règles pures : `#lib/collaborations/rules`.
 */
import { prisma } from '#lib/server';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { emitAndProcess } from '#lib/server/progression/processor';
import { parisDay } from '#lib/metrics/indicators';
import {
	collabStatus,
	hasHappened,
	nextStep,
	type CollabKindValue,
	type CollabStatusValue
} from '#lib/collaborations/rules';

export class CollaborationError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

const dayOf = (d: Date) => d.toISOString().slice(0, 10);

export async function proposeCollaboration(
	proposerId: string,
	conversationId: string,
	input: { kind: CollabKindValue; title: string; happenedOn: string },
	now = new Date()
) {
	const conversation = await prisma.conversation.findUnique({
		where: { id: conversationId },
		select: {
			opportunityId: true,
			participants: { select: { actorId: true, state: true } }
		}
	});
	const me = conversation?.participants.find((p) => p.actorId === proposerId);
	const other = conversation?.participants.find((p) => p.actorId !== proposerId);
	if (!conversation || !me || !other)
		throw new CollaborationError('Conversation introuvable.', 404);
	if (me.state !== 'ACCEPTED' || other.state !== 'ACCEPTED') {
		throw new CollaborationError('Proposez une collaboration une fois la conversation ouverte.');
	}
	if (await isBlockedBetween(proposerId, other.actorId)) {
		throw new CollaborationError('Cette conversation est fermée.');
	}
	const day = new Date(`${input.happenedOn}T00:00:00Z`);
	const duplicate = await prisma.collaboration.count({
		where: {
			conversationId,
			happenedOn: day,
			status: { in: ['PROPOSED', 'ACCEPTED', 'COMPLETED'] }
		}
	});
	if (duplicate > 0) throw new CollaborationError('Une collaboration existe déjà pour ce jour.');
	const happened = hasHappened(input.happenedOn, now);
	return prisma.collaboration.create({
		data: {
			kind: input.kind,
			title: input.title,
			happenedOn: day,
			proposedById: proposerId,
			conversationId,
			opportunityId: conversation.opportunityId,
			participants: {
				create: [
					// Proposer vaut accord, et confirmation si c'est déjà passé.
					{ actorId: proposerId, acceptedAt: now, confirmedCompletionAt: happened ? now : null },
					{ actorId: other.actorId }
				]
			}
		},
		select: { id: true }
	});
}

async function load(actorId: string, collaborationId: string) {
	const collab = await prisma.collaboration.findUnique({
		where: { id: collaborationId },
		include: { participants: true }
	});
	const me = collab?.participants.find((p) => p.actorId === actorId);
	if (!collab || !me) throw new CollaborationError('Collaboration introuvable.', 404);
	for (const p of collab.participants) {
		if (p.actorId !== actorId && (await isBlockedBetween(actorId, p.actorId))) {
			throw new CollaborationError('Cette collaboration ne peut plus avancer.');
		}
	}
	return { collab, me };
}

/** Recalcule l'état et, si tout le monde a confirmé, émet l'événement. */
async function settle(collaborationId: string, now: Date) {
	await prisma.$transaction(async (tx) => {
		const collab = await tx.collaboration.findUniqueOrThrow({
			where: { id: collaborationId },
			include: { participants: true }
		});
		if (collab.status === 'CANCELLED' || collab.status === 'COMPLETED') return;
		const status = collabStatus(
			collab.participants.map((p) => ({
				accepted: p.acceptedAt !== null,
				confirmed: p.confirmedCompletionAt !== null
			}))
		);
		if (status === collab.status) return;
		await tx.collaboration.update({
			where: { id: collaborationId },
			data: { status, ...(status === 'COMPLETED' ? { completedAt: now } : {}) }
		});
		if (status === 'COMPLETED') {
			await emitAndProcess(tx, {
				type: 'collaboration.completed',
				collaborationId,
				participantIds: collab.participants.map((p) => p.actorId)
			});
		}
	});
}

export async function respondToCollaboration(
	actorId: string,
	collaborationId: string,
	accept: boolean,
	now = new Date()
) {
	const { collab, me } = await load(actorId, collaborationId);
	if (collab.status !== 'PROPOSED' || me.acceptedAt) {
		throw new CollaborationError('Cette proposition a déjà une réponse.');
	}
	if (!accept) {
		await prisma.collaboration.update({
			where: { id: collaborationId },
			data: { status: 'CANCELLED' }
		});
		return;
	}
	await prisma.collaborationParticipant.update({
		where: { collaborationId_actorId: { collaborationId, actorId } },
		data: {
			acceptedAt: now,
			// Si c'est déjà passé, accepter vaut confirmer.
			...(hasHappened(dayOf(collab.happenedOn), now) ? { confirmedCompletionAt: now } : {})
		}
	});
	await settle(collaborationId, now);
}

export async function confirmCollaboration(
	actorId: string,
	collaborationId: string,
	now = new Date()
) {
	const { collab, me } = await load(actorId, collaborationId);
	if (collab.status !== 'ACCEPTED' || me.confirmedCompletionAt) {
		throw new CollaborationError('Rien à confirmer ici.');
	}
	if (!hasHappened(dayOf(collab.happenedOn), now)) {
		throw new CollaborationError('Tu pourras confirmer une fois la date passée.');
	}
	await prisma.collaborationParticipant.update({
		where: { collaborationId_actorId: { collaborationId, actorId } },
		data: { confirmedCompletionAt: now }
	});
	await settle(collaborationId, now);
}

export async function cancelCollaboration(actorId: string, collaborationId: string) {
	const collab = await prisma.collaboration.findUnique({
		where: { id: collaborationId },
		include: { participants: true }
	});
	if (!collab || !collab.participants.some((p) => p.actorId === actorId)) {
		throw new CollaborationError('Collaboration introuvable.', 404);
	}
	if (collab.status === 'COMPLETED' || collab.status === 'CANCELLED') {
		throw new CollaborationError('Elle ne peut plus être annulée.');
	}
	await prisma.collaboration.update({
		where: { id: collaborationId },
		data: { status: 'CANCELLED' }
	});
}

type Row = Awaited<ReturnType<typeof rows>>[number];
function rows(where: object) {
	return prisma.collaboration.findMany({
		where,
		orderBy: { happenedOn: 'desc' },
		take: 20,
		include: {
			participants: {
				include: { actor: { select: { displayName: true, handle: true, deletedAt: true } } }
			}
		}
	});
}

function view(actorId: string, c: Row, now: Date) {
	const me = c.participants.find((p) => p.actorId === actorId)!;
	const others = c.participants.filter((p) => p.actorId !== actorId);
	const status = c.status as CollabStatusValue;
	return {
		id: c.id,
		kind: c.kind as CollabKindValue,
		title: c.title,
		happenedOn: dayOf(c.happenedOn),
		status,
		conversationId: c.conversationId,
		with: others.map((p) => p.actor.displayName).join(', '),
		step: nextStep(
			status,
			{ accepted: me.acceptedAt !== null, confirmed: me.confirmedCompletionAt !== null },
			hasHappened(dayOf(c.happenedOn), now)
		)
	};
}

/** Collaborations d'une conversation, vues par l'un de ses participants. */
export async function listForConversation(
	actorId: string,
	conversationId: string,
	now = new Date()
) {
	const list = await rows({
		conversationId,
		participants: { some: { actorId } },
		status: { not: 'CANCELLED' }
	});
	return list.map((c) => view(actorId, c, now));
}

/** Ce qui attend ma réponse ou ma confirmation (tableau de bord). */
export async function pendingForMe(actorId: string, now = new Date()) {
	const list = await rows({
		participants: { some: { actorId } },
		status: { in: ['PROPOSED', 'ACCEPTED'] }
	});
	return list
		.map((c) => view(actorId, c, now))
		.filter((c) => c.step === 'respond' || c.step === 'confirm');
}

/** Jour d'aujourd'hui à Paris, pour pré-remplir les formulaires. */
export const today = (now = new Date()) => parisDay(now);
