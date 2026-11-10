/**
 * Récap de campagne d'un morceau (P4-10, conception 07 §3.2) : le chemin
 * d'un morceau composé, de l'idée au son final, lu dans les faits (dates du
 * morceau, collaborations du son terminées, étape vérifiée du groupe).
 * Jamais d'XP. Les noms ne sortent que pour des profils visibles ; un studio,
 * que si sa fiche est publiée.
 */
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { campaignDone, type JourneyStep } from '#lib/works/journey';

const SOUND_KINDS = ['RECORDING', 'MIXING', 'MASTERING', 'PRODUCTION'] as const;

export async function workJourney(workId: string, now = new Date()) {
	const work = await prisma.work.findUnique({
		where: { id: workId },
		select: {
			createdAt: true,
			composedAt: true,
			masteredAt: true,
			producedAt: true,
			contributors: { where: { confirmedAt: { not: null } }, select: { personId: true } },
			collaborations: {
				where: { status: 'COMPLETED', kind: { in: [...SOUND_KINDS] } },
				orderBy: { happenedOn: 'asc' },
				select: {
					kind: true,
					happenedOn: true,
					participants: { where: { service: { not: null } }, select: { actorId: true } },
					studio: {
						select: {
							studio: { select: { publishedAt: true } },
							actor: { select: { handle: true, displayName: true } }
						}
					}
				}
			}
		}
	});
	if (!work?.composedAt) return null;

	const proIds = [
		...new Set(work.collaborations.flatMap((c) => c.participants.map((p) => p.actorId)))
	];
	const [visible, verified] = await Promise.all([
		prisma.actor.findMany({
			where: { id: { in: proIds }, ...publicActorWhere(now) },
			select: { id: true, handle: true, displayName: true }
		}),
		prisma.milestone.findFirst({
			where: { workId, definitionId: 'FIRST_RECORDING', proof: 'VERIFIED', frozenAt: null },
			select: { id: true }
		})
	]);
	const byId = new Map(visible.map((a) => [a.id, a]));

	const steps: JourneyStep[] = [
		{ kind: 'IDEA', at: work.createdAt, pro: null, studio: null, verified: false },
		{
			kind: 'COMPOSED',
			at: work.composedAt,
			pro: null,
			studio: null,
			verified: false,
			people: work.contributors.length
		}
	];
	let recordingVerified = false;
	for (const c of work.collaborations) {
		const pro = c.participants.map((p) => byId.get(p.actorId)).find(Boolean);
		const studio = c.studio?.studio?.publishedAt ? c.studio.actor : null;
		// L'étape vérifiée s'affiche sur le premier enregistrement seulement.
		const isFirstRecording = c.kind === 'RECORDING' && !recordingVerified && Boolean(verified);
		if (isFirstRecording) recordingVerified = true;
		steps.push({
			// Filtrées sur `SOUND_KINDS` dans la requête.
			kind: c.kind as (typeof SOUND_KINDS)[number],
			at: c.happenedOn,
			pro: pro ? { handle: pro.handle, name: pro.displayName } : null,
			studio: studio ? { handle: studio.handle, name: studio.displayName } : null,
			verified: isFirstRecording
		});
	}
	return {
		steps,
		done: campaignDone({ masteredAt: work.masteredAt, producedAt: work.producedAt }),
		finishedAt: work.producedAt ?? work.masteredAt ?? null,
		startedAt: work.createdAt
	};
}

export type WorkJourney = NonNullable<Awaited<ReturnType<typeof workJourney>>>;
