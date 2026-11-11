/**
 * Collaborations (P2-06) : proposer à un contact (conversation acceptée),
 * répondre, confirmer, annuler. Quand chaque participant a confirmé :
 * `collaboration.completed`, traité par le moteur dans la même transaction
 * (400 XP × multiplicateurs : rendement décroissant par contrepartie,
 * confiance de la contrepartie). Règles pures : `#lib/collaborations/rules`.
 *
 * Liées au morceau (P4-06) : une collaboration peut porter sur un morceau
 * géré par l'une des deux personnes, et une prestation du son (prise de son,
 * mixage, mastering, sonorisation, production) assurée par l'une d'elles, qui
 * en a le métier. Terminée, elle fait avancer le morceau (enregistré, mixé,
 * masterisé, produit) et crédite chacun·e sur sa piste.
 *
 * Au studio (P4-03c) : une répétition, un enregistrement… peut se tenir dans
 * un studio que gère l'une des deux personnes. Confirmée par un·e client·e,
 * c'est une session du studio (`#lib/server/studios/service`).
 *
 * Étapes vérifiées par les pros (P4-09) : un enregistrement terminé avec un·e
 * ingé son ou dans un studio de la plateforme, relié à un morceau du groupe,
 * vérifie son « Premier enregistrement ».
 */
import { prisma } from '#lib/server';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { emitAndProcess } from '#lib/server/progression/processor';
import { notify } from '#lib/server/notifications/service';
import { parisDay } from '#lib/metrics/indicators';
import {
	checkProvider,
	collabStatus,
	hasHappened,
	KIND_SERVICE,
	KIND_WORK_ROLE,
	KIND_WORK_STAGE,
	nextStep,
	type CollabKindValue,
	type CollabStatusValue
} from '#lib/collaborations/rules';
import { creditFromCollaboration, manageableWorks } from '#lib/server/works/service';
import { isStudioSessionKind } from '#lib/studios/rules';
import { verifyRecordingFromCollaboration } from '#lib/server/milestones/service';
import { markSucceeded } from '#lib/server/career/introductions';

/**
 * Studios publiés que gère l'une des deux personnes (P4-03c), pour y
 * rattacher une collaboration. `handle` : un seul, s'il en fait partie.
 */
async function studiosOfPair(meId: string, otherId: string, handle?: string) {
	const rows = await prisma.actor.findMany({
		where: {
			...(handle ? { handle } : {}),
			kind: 'ORGANIZATION',
			deletedAt: null,
			organization: {
				kind: 'STUDIO',
				dissolvedAt: null,
				studio: { publishedAt: { not: null } },
				memberships: {
					some: {
						personId: { in: [meId, otherId] },
						status: 'ACTIVE',
						role: { in: ['OWNER', 'ADMIN'] }
					}
				}
			}
		},
		orderBy: { displayName: 'asc' },
		select: {
			id: true,
			handle: true,
			displayName: true,
			organization: {
				select: {
					memberships: {
						where: { personId: meId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } },
						select: { personId: true }
					}
				}
			}
		}
	});
	return rows.map((r) => ({
		id: r.id,
		handle: r.handle,
		name: r.displayName,
		mine: (r.organization?.memberships.length ?? 0) > 0
	}));
}

export class CollaborationError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

const dayOf = (d: Date) => d.toISOString().slice(0, 10);
/**
 * Terminer une collaboration traite la progression, les crédits et l'étape
 * du groupe (P4-09) : plus que les 5 s par défaut de Prisma sur Neon.
 */
const SETTLE_TX = { timeout: 20_000 } as const;

export async function proposeCollaboration(
	proposerId: string,
	conversationId: string,
	input: {
		kind: CollabKindValue;
		title: string;
		happenedOn: string;
		/** Qui assure la prestation du son (P4-06). */
		provider?: 'me' | 'other';
		/** Morceau concerné (P4-06). */
		work?: string;
		/** Studio où elle a lieu (P4-03c), par son nom d'utilisateur. */
		studio?: string;
	},
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
	// Prestation du son (P4-06) : la personne qui l'assure en a le métier.
	const tracksOf = async (actorId: string) =>
		(
			await prisma.personTrack.findMany({ where: { personId: actorId }, select: { track: true } })
		).map((t) => t.track as string);
	const provider = checkProvider(input.kind, input.provider ?? null, {
		me: await tracksOf(proposerId),
		other: await tracksOf(other.actorId)
	});
	if (!provider.ok) throw new CollaborationError(provider.message);
	const service = KIND_SERVICE[input.kind]?.service ?? null;
	const serviceOf = (who: 'me' | 'other') =>
		provider.provider === who && service ? service : null;
	// Morceau (P4-06) : géré par l'une des deux personnes.
	if (input.work) {
		const [mine, theirs] = await Promise.all([
			manageableWorks(proposerId),
			manageableWorks(other.actorId)
		]);
		if (![...mine, ...theirs].some((w) => w.id === input.work)) {
			throw new CollaborationError('Ce morceau n’est pas à l’un de vous deux.', 403);
		}
	}
	// Studio (P4-03c) : géré par l'une des deux personnes, pour une
	// collaboration qui s'y tient (répétition, enregistrement…).
	let studioId: string | null = null;
	if (input.studio) {
		if (!isStudioSessionKind(input.kind)) {
			throw new CollaborationError('Ce type de collaboration ne se tient pas dans un studio.');
		}
		const [studio] = await studiosOfPair(proposerId, other.actorId, input.studio);
		if (!studio)
			throw new CollaborationError('Ce studio n’est pas géré par l’un de vous deux.', 403);
		studioId = studio.id;
	}
	const happened = hasHappened(input.happenedOn, now);
	const created = await prisma.collaboration.create({
		data: {
			kind: input.kind,
			title: input.title,
			happenedOn: day,
			proposedById: proposerId,
			conversationId,
			opportunityId: conversation.opportunityId,
			workId: input.work ?? null,
			studioId,
			participants: {
				create: [
					// Proposer vaut accord, et confirmation si c'est déjà passé.
					{
						actorId: proposerId,
						acceptedAt: now,
						confirmedCompletionAt: happened ? now : null,
						service: serviceOf('me')
					},
					{ actorId: other.actorId, service: serviceOf('other') }
				]
			}
		},
		select: { id: true }
	});
	// Notification (P2-09a) : l'autre personne a une collaboration à confirmer.
	await notify(prisma, {
		recipientId: other.actorId,
		type: 'COLLAB_TO_CONFIRM',
		fromActorId: proposerId,
		href: `/messages/${conversationId}`,
		title: input.title
	});
	return created;
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
			// Prestations du son (P4-06) : chacun·e gagne sur sa piste.
			const services = Object.fromEntries(
				collab.participants.flatMap((p) => (p.service ? [[p.actorId, p.service]] : []))
			);
			await emitAndProcess(tx, {
				type: 'collaboration.completed',
				collaborationId,
				participantIds: collab.participants.map((p) => p.actorId),
				...(Object.keys(services).length > 0 ? { services } : {})
			});
			// Parrainage (P4-13b) : deux personnes présentées collaborent, succès Passeur.
			await markSucceeded(
				tx,
				{ id: collaborationId, participantIds: collab.participants.map((p) => p.actorId) },
				now
			);
			// Le morceau avance (P4-06) : la première fois seulement.
			const stage = KIND_WORK_STAGE[collab.kind as CollabKindValue];
			if (collab.workId && stage) {
				await tx.work.updateMany({
					where: { id: collab.workId, [stage]: null },
					data: { [stage]: now }
				});
			}
			// Crédit confirmé de la personne qui a assuré la prestation (P4-07).
			const role = KIND_WORK_ROLE[collab.kind as CollabKindValue];
			if (collab.workId && role) {
				for (const p of collab.participants.filter((x) => x.service)) {
					await creditFromCollaboration(
						tx,
						{ workId: collab.workId, personId: p.actorId, kind: role },
						now
					);
				}
			}
			// Un enregistrement avec un·e pro vérifie l'étape du groupe (P4-09).
			if (collab.kind === 'RECORDING' && collab.workId) {
				await verifyRecordingFromCollaboration(
					tx,
					{
						workId: collab.workId,
						happenedOn: collab.happenedOn,
						studioId: collab.studioId,
						participants: collab.participants.map((p) => ({
							actorId: p.actorId,
							service: p.service
						}))
					},
					now
				);
			}
		}
	}, SETTLE_TX);
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
			},
			work: { select: { id: true, title: true } }
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
		/** Qui assure la prestation du son (P4-06) : moi, l'autre, ou personne. */
		provider: me.service
			? ('me' as const)
			: others.some((p) => p.service)
				? ('other' as const)
				: null,
		work: c.work ? { id: c.work.id, title: c.work.title } : null,
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

/**
 * Ce qu'il faut pour proposer une collaboration liée au morceau (P4-06) : les
 * métiers des deux personnes, les morceaux proposables (tous les miens ; ceux
 * de l'autre seulement s'ils sont composés, pour ne pas révéler une idée) et
 * le morceau de l'annonce d'origine, s'il y en a un.
 */
export async function collabFormContext(actorId: string, conversationId: string) {
	const conversation = await prisma.conversation.findUnique({
		where: { id: conversationId },
		select: { opportunityId: true, participants: { select: { actorId: true } } }
	});
	const otherId = conversation?.participants.find((p) => p.actorId !== actorId)?.actorId;
	if (!conversation || !otherId) return null;
	const tracksOf = async (id: string) =>
		(await prisma.personTrack.findMany({ where: { personId: id }, select: { track: true } })).map(
			(t) => t.track as string
		);
	const [myTracks, otherTracks, mine, theirs, opportunity, studios] = await Promise.all([
		tracksOf(actorId),
		tracksOf(otherId),
		manageableWorks(actorId),
		manageableWorks(otherId),
		conversation.opportunityId
			? prisma.opportunity.findUnique({
					where: { id: conversation.opportunityId },
					select: { workId: true }
				})
			: null,
		studiosOfPair(actorId, otherId)
	]);
	const composed = new Set(
		(
			await prisma.work.findMany({
				where: { id: { in: theirs.map((w) => w.id) }, state: 'COMPOSED' },
				select: { id: true }
			})
		).map((w) => w.id)
	);
	const works = [
		...mine.map((w) => ({ id: w.id, title: w.title, band: w.band, mine: true })),
		...theirs
			.filter((w) => composed.has(w.id) && !mine.some((m) => m.id === w.id))
			.map((w) => ({ id: w.id, title: w.title, band: w.band, mine: false }))
	];
	const defaultWork = works.some((w) => w.id === opportunity?.workId) ? opportunity!.workId : null;
	return {
		tracks: { me: myTracks, other: otherTracks },
		works,
		defaultWork,
		// Studios où la tenir (P4-03c) : le nom d'utilisateur, jamais l'identifiant.
		studios: studios.map(({ handle, name, mine }) => ({ handle, name, mine }))
	};
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
