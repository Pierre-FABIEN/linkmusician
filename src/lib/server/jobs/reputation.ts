/**
 * LINKMUSICIAN (P2-08) : recalcul nocturne de la carte de réputation de toutes
 * les personnes. En plus du recalcul après chaque événement : la réactivité
 * change sans événement (une demande reste sans réponse, une autre sort de la
 * fenêtre de 180 jours).
 */
import { prisma } from '#lib/server';
import { recomputeReputation } from '#lib/server/progression/reputation';

const BATCH = 50;

export async function runReputationJob(now = new Date()) {
	let cursor: string | undefined;
	let processed = 0;
	for (;;) {
		const persons = await prisma.person.findMany({
			select: { actorId: true },
			orderBy: { actorId: 'asc' },
			take: BATCH,
			...(cursor ? { skip: 1, cursor: { actorId: cursor } } : {})
		});
		if (persons.length === 0) break;
		const ids = persons.map((p) => p.actorId);
		processed += await prisma.$transaction((tx) => recomputeReputation(tx, ids, now), {
			timeout: 60_000
		});
		cursor = ids.at(-1);
	}
	return { processed };
}
