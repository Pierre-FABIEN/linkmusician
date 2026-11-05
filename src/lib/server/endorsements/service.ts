/**
 * Appréciations (endossements), communes aux jams (P2-15) et aux
 * collaborations (P2-07) : reprise, et lecture pour le profil public.
 *
 * Une appréciation reprise n'est jamais effacée du registre : son XP est
 * repris par transaction négative liée (`reverseGain`), et l'événement
 * `endorsement.revoked` la retire du palier (endosseurs distincts).
 */
import { prisma } from '#lib/server';
import { emitAndProcess, reverseGain } from '#lib/server/progression/processor';
import { JAM_QUALITY_LABELS } from '#lib/jam/afterJam';
import { COLLAB_QUALITY_LABELS } from '#lib/collaborations/endorse';

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
 * Appréciations reçues, pour le profil : par qualité ou instrument, des plus
 * fréquentes, jams et collaborations confondues.
 */
export async function endorsementsReceived(actorId: string) {
	const where = { toActorId: actorId, revokedAt: null };
	const select = { quality: true, instrument: { select: { name: true } } } as const;
	const [jams, collabs] = await Promise.all([
		prisma.jamEndorsement.findMany({ where, select }),
		prisma.collabEndorsement.findMany({ where, select })
	]);
	const labels = [
		...jams.map((r) => (r.quality ? JAM_QUALITY_LABELS[r.quality] : r.instrument?.name)),
		...collabs.map((r) => (r.quality ? COLLAB_QUALITY_LABELS[r.quality] : r.instrument?.name))
	];
	const counts = new Map<string, number>();
	for (const raw of labels) {
		const label = raw?.toLowerCase();
		if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([label, count]) => ({ label, count }))
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
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
