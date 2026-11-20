/**
 * Annuler une jam (#91a, RV-01) : l'hôte annule, les inscrit·es et
 * invité·es sont prévenu·es, la trace reste.
 *
 * - Statut `CLOSED` (le statut partagé d'`Opportunity` ne change pas) et
 *   `cancelledAt`, motif facultatif, auteur : une annulation se distingue
 *   d'une annonce simplement clôturée. Rien n'est supprimé : « Je viens »,
 *   invitations et présences restent.
 * - Possible jusqu'à la fin de la jam ; après, une jam qui n'a pas eu lieu
 *   se signale (#91b).
 * - Prévenir est **sans expéditeur** (`JAM_CANCELLED`) : une personne bloquée
 *   par l'hôte doit, elle aussi, savoir qu'il ne faut pas se déplacer.
 * - Une annulation n'est jamais une preuve de jam fictive : aucune sanction,
 *   aucune XP reprise.
 * - Arrêter une scène ouverte (`series#stopJamSeries`) annule ses dates à
 *   venir par la même voie.
 */
import { prisma } from '#lib/server';
import { notify } from '#lib/server/notifications/service';
import { JamError } from './publicJams';
import { isHostOf, issuerManagersSelect } from './hosts';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export const MAX_CANCEL_REASON = 300;

/** Personnes à prévenir : « Je viens », présences, invitations en cours ou acceptées. */
async function participantIds(tx: Tx, jamId: string) {
	const [attendances, invites] = await Promise.all([
		tx.jamAttendance.findMany({ where: { opportunityId: jamId }, select: { actorId: true } }),
		tx.jamInvite.findMany({
			where: { opportunityId: jamId, status: { in: ['INVITED', 'ACCEPTED'] } },
			select: { actorId: true }
		})
	]);
	return [...new Set([...attendances, ...invites].map((r) => r.actorId))];
}

/**
 * Annule des jams ouvertes et prévient leurs participant·es, sauf la personne
 * qui annule. Idempotent : une jam déjà fermée n'est ni réannulée ni renotifiée.
 */
export async function cancelJamsTx(
	tx: Tx,
	jamIds: string[],
	input: { byId: string; reason: string | null; now: Date }
) {
	let cancelled = 0;
	for (const id of jamIds) {
		const { count } = await tx.opportunity.updateMany({
			where: { id, kind: 'JAM', status: 'OPEN' },
			data: {
				status: 'CLOSED',
				closedAt: input.now,
				cancelledAt: input.now,
				cancelReason: input.reason,
				cancelledById: input.byId
			}
		});
		if (count === 0) continue;
		cancelled++;
		const jam = await tx.opportunity.findUniqueOrThrow({ where: { id }, select: { title: true } });
		for (const recipientId of await participantIds(tx, id)) {
			if (recipientId === input.byId) continue;
			await notify(tx, {
				recipientId,
				type: 'JAM_CANCELLED',
				href: `/jams/${id}`,
				title: jam.title
			});
		}
	}
	return cancelled;
}

const cleanReason = (raw: string) =>
	raw.replace(/\s+/g, ' ').trim().slice(0, MAX_CANCEL_REASON) || null;

/** L'hôte annule sa jam, jusqu'à sa fin. */
export async function cancelJam(id: string, actorId: string, rawReason = '', now = new Date()) {
	const jam = await prisma.opportunity.findFirst({
		where: { id, kind: 'JAM' },
		select: {
			status: true,
			endsAt: true,
			cancelledAt: true,
			issuerActorId: true,
			issuer: { select: issuerManagersSelect }
		}
	});
	if (!jam || !isHostOf(jam, actorId)) {
		// Même réponse pour une jam inconnue ou d'autrui.
		throw new JamError('Seul·e l’hôte annule sa jam.', 403);
	}
	if (jam.cancelledAt) throw new JamError('Cette jam est déjà annulée.');
	if (jam.status !== 'OPEN' || !jam.endsAt || jam.endsAt <= now) {
		throw new JamError('Cette jam est terminée : elle ne s’annule plus.');
	}
	await prisma.$transaction((tx) =>
		cancelJamsTx(tx, [id], { byId: actorId, reason: cleanReason(rawReason), now })
	);
}

/**
 * Une jam annulée, pour une personne qui y participait ou l'organisait :
 * titre, date, lieu et motif. `null` pour toute autre personne (D81).
 */
export async function cancelledJamFor(id: string, viewerId: string) {
	const jam = await prisma.opportunity.findFirst({
		where: {
			id,
			kind: 'JAM',
			cancelledAt: { not: null },
			OR: [
				{ issuerActorId: viewerId },
				{
					issuer: {
						organization: {
							memberships: {
								some: { personId: viewerId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } }
							}
						}
					}
				},
				{ attendances: { some: { actorId: viewerId } } },
				{ jamInvites: { some: { actorId: viewerId } } }
			]
		},
		select: {
			id: true,
			title: true,
			startsAt: true,
			cancelledAt: true,
			cancelReason: true,
			venue: { select: { name: true, communeName: true } }
		}
	});
	if (!jam?.startsAt || !jam.cancelledAt) return null;
	return {
		id: jam.id,
		title: jam.title,
		startsAt: jam.startsAt,
		cancelledAt: jam.cancelledAt,
		reason: jam.cancelReason,
		venue: jam.venue
	};
}
