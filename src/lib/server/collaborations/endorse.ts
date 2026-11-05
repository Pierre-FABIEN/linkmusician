/**
 * Appréciations après une collaboration confirmée (P2-07, D27). Règles
 * pures : `#lib/collaborations/endorse`.
 *
 * Une appréciation émet `endorsement.received` (≈ 40 XP pour la personne
 * appréciée, rendements décroissants par paire). La reprendre reprend l'XP
 * par transaction négative liée et émet `endorsement.revoked`.
 */
import { prisma } from '#lib/server';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { getTrustLevel } from '#lib/server/trust/quotas';
import { emitAndProcess } from '#lib/server/progression/processor';
import { TRUST_PERMISSIONS } from '#lib/server/progression/core/trust';
import { revokeEndorsementEvent } from '#lib/server/endorsements/service';
import {
	COLLAB_QUALITY_LABELS,
	collabEndorseRefusal,
	type CollabEndorseForm
} from '#lib/collaborations/endorse';
import { CollaborationError } from './service';

const labelOf = (row: {
	quality: keyof typeof COLLAB_QUALITY_LABELS | null;
	instrument: { name: string } | null;
}) =>
	row.quality ? COLLAB_QUALITY_LABELS[row.quality] : (row.instrument?.name.toLowerCase() ?? '');

async function participantsOf(collaborationId: string) {
	const collab = await prisma.collaboration.findUnique({
		where: { id: collaborationId },
		select: { status: true, participants: { select: { actorId: true } } }
	});
	if (!collab) throw new CollaborationError('Collaboration introuvable.', 404);
	return {
		completed: collab.status === 'COMPLETED',
		ids: collab.participants.map((p) => p.actorId)
	};
}

/** Apprécier un·e partenaire de collaboration : une par paire et par collaboration. */
export async function endorseCollaborator(
	fromId: string,
	form: CollabEndorseForm,
	now = new Date()
) {
	const collab = await participantsOf(form.collaborationId);
	if (!collab.ids.includes(fromId)) throw new CollaborationError('Collaboration introuvable.', 404);
	const to = await prisma.actor.findFirst({
		where: { handle: form.to, deletedAt: null },
		select: { id: true, displayName: true }
	});
	if (!to) throw new CollaborationError('Personne inconnue.', 404);
	const [existing, trust, blocked, instrument] = await Promise.all([
		prisma.collabEndorsement.findUnique({
			where: {
				collaborationId_fromActorId_toActorId: {
					collaborationId: form.collaborationId,
					fromActorId: fromId,
					toActorId: to.id
				}
			},
			select: { id: true, revokedAt: true }
		}),
		getTrustLevel(fromId),
		isBlockedBetween(fromId, to.id),
		// Seulement un instrument que la personne déclare jouer.
		form.instrument
			? prisma.instrument.findFirst({
					where: {
						slug: form.instrument,
						active: true,
						personInstruments: { some: { personId: to.id } }
					},
					select: { id: true, name: true }
				})
			: null
	]);
	const refusal = collabEndorseRefusal({
		fromId,
		toId: to.id,
		completed: collab.completed,
		fromIsParticipant: true,
		toIsParticipant: collab.ids.includes(to.id),
		fromCanEndorse: TRUST_PERMISSIONS[trust].canEndorse,
		blocked,
		alreadyEndorsed: Boolean(existing && !existing.revokedAt)
	});
	if (refusal) throw new CollaborationError(refusal, 403);
	if (form.instrument && !instrument) throw new CollaborationError('Instrument inconnu.');
	const skill = form.quality ? COLLAB_QUALITY_LABELS[form.quality] : instrument!.name.toLowerCase();
	const data = { quality: form.quality ?? null, instrumentId: instrument?.id ?? null };
	await prisma.$transaction(async (tx) => {
		// Redonnée après une reprise : la même ligne reprend vie.
		const row = existing
			? await tx.collabEndorsement.update({
					where: { id: existing.id },
					data: { ...data, revokedAt: null, eventId: null }
				})
			: await tx.collabEndorsement.create({
					data: {
						...data,
						collaborationId: form.collaborationId,
						fromActorId: fromId,
						toActorId: to.id
					}
				});
		const result = await emitAndProcess(tx, {
			type: 'endorsement.received',
			actorId: to.id,
			endorserId: fromId,
			skill,
			collaborationId: form.collaborationId,
			occurredAt: now
		});
		await tx.collabEndorsement.update({ where: { id: row.id }, data: { eventId: result.eventId } });
	});
	return { displayName: to.displayName, skill };
}

/** Reprendre son appréciation : l'XP est repris (transaction négative liée). */
export async function revokeCollabEndorsement(
	fromId: string,
	collaborationId: string,
	handle: string,
	now = new Date()
) {
	const row = await prisma.collabEndorsement.findFirst({
		where: { collaborationId, fromActorId: fromId, to: { handle }, revokedAt: null },
		select: { id: true, eventId: true, toActorId: true }
	});
	if (!row) throw new CollaborationError('Aucune appréciation à reprendre.', 404);
	await prisma.$transaction(async (tx) => {
		await tx.collabEndorsement.update({ where: { id: row.id }, data: { revokedAt: now } });
		await revokeEndorsementEvent(
			tx,
			{
				eventId: row.eventId,
				actorId: row.toActorId,
				endorserId: fromId,
				reason: 'Appréciation reprise'
			},
			now
		);
	});
}

/**
 * Pour chaque collaboration confirmée de la liste, les partenaires que la
 * personne peut apprécier, leurs instruments déclarés, et ce qu'elle leur a
 * déjà laissé.
 */
export async function collabAppreciations(viewerId: string, collaborationIds: string[]) {
	if (collaborationIds.length === 0) return { canEndorse: false, byCollab: {} };
	const [collabs, given, trust] = await Promise.all([
		prisma.collaboration.findMany({
			where: {
				id: { in: collaborationIds },
				status: 'COMPLETED',
				participants: { some: { actorId: viewerId } }
			},
			select: {
				id: true,
				participants: {
					where: { actorId: { not: viewerId }, actor: { deletedAt: null } },
					select: {
						actor: {
							select: {
								id: true,
								handle: true,
								displayName: true,
								person: {
									select: {
										instruments: {
											orderBy: [{ isPrimary: 'desc' }, { declaredLevel: 'desc' }],
											select: { instrument: { select: { slug: true, name: true } } }
										}
									}
								}
							}
						}
					}
				}
			}
		}),
		prisma.collabEndorsement.findMany({
			where: { collaborationId: { in: collaborationIds }, fromActorId: viewerId, revokedAt: null },
			select: {
				collaborationId: true,
				toActorId: true,
				quality: true,
				instrument: { select: { name: true } }
			}
		}),
		getTrustLevel(viewerId)
	]);
	const givenTo = new Map(given.map((g) => [`${g.collaborationId}|${g.toActorId}`, labelOf(g)]));
	const byCollab: Record<
		string,
		{
			handle: string;
			displayName: string;
			instruments: { slug: string; name: string }[];
			given: string | null;
		}[]
	> = {};
	for (const c of collabs) {
		byCollab[c.id] = c.participants
			.filter((p) => p.actor.handle)
			.map(({ actor }) => ({
				handle: actor.handle!,
				displayName: actor.displayName,
				instruments: actor.person?.instruments.map((i) => i.instrument) ?? [],
				given: givenTo.get(`${c.id}|${actor.id}`) ?? null
			}));
	}
	return { canEndorse: TRUST_PERMISSIONS[trust].canEndorse, byCollab };
}
