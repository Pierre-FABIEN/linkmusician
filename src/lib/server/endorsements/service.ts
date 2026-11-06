/**
 * Appréciations (endossements), communes aux jams (P2-15) et aux
 * collaborations (P2-07) : reprise, et lecture pour le profil public. Les
 * appréciations par libellé vivent dans la carte de réputation (P2-08,
 * `#lib/server/progression/reputation`).
 *
 * Une appréciation reprise n'est jamais effacée du registre : son XP est
 * repris par transaction négative liée (`reverseGain`), et l'événement
 * `endorsement.revoked` la retire du palier (endosseurs distincts).
 */
import { prisma } from '#lib/server';
import { emitAndProcess, reverseGain } from '#lib/server/progression/processor';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Reprend l'XP d'une appréciation et émet `endorsement.revoked`. */
export async function revokeEndorsementEvent(
	tx: Tx,
	input: { eventId: string | null; actorId: string; endorserId: string; reason: string },
	now = new Date()
) {
	if (!input.eventId) return;
	const gains = await tx.xpTransaction.findMany({
		where: { sourceEventId: input.eventId, reversesId: null, reversedBy: null },
		select: { id: true }
	});
	for (const g of gains) await reverseGain(tx, g.id, input.reason);
	await emitAndProcess(tx, {
		type: 'endorsement.revoked',
		actorId: input.actorId,
		endorserId: input.endorserId,
		endorsementEventId: input.eventId,
		occurredAt: now
	});
}

/**
 * « Endossé par N » sur chaque instrument du profil : nombre de personnes
 * distinctes qui ont apprécié cet instrument (jams et collaborations).
 */
export async function endorsersByInstrument(actorId: string): Promise<Map<string, number>> {
	const where = { toActorId: actorId, revokedAt: null, instrumentId: { not: null } };
	const select = { instrumentId: true, fromActorId: true } as const;
	const [jams, collabs] = await Promise.all([
		prisma.jamEndorsement.findMany({ where, select }),
		prisma.collabEndorsement.findMany({ where, select })
	]);
	const people = new Map<string, Set<string>>();
	for (const r of [...jams, ...collabs]) {
		if (!r.instrumentId) continue;
		const set = people.get(r.instrumentId) ?? new Set<string>();
		set.add(r.fromActorId);
		people.set(r.instrumentId, set);
	}
	return new Map([...people.entries()].map(([id, set]) => [id, set.size]));
}
