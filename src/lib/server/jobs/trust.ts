/**
 * LINKMUSICIAN (P1-09) : recalcul nocturne de la confiance de toutes les
 * personnes. Nécessaire en plus du recalcul à chaque événement : l'ancienneté
 * seule fait passer des paliers (7, 30, 90 jours), sans aucun événement.
 */
import { prisma } from '#lib/server';
import { recomputeTrust } from '#lib/server/progression/trust';

const BATCH = 50;

export async function runTrustJob() {
	let cursor: string | undefined;
	let processed = 0;
	let changed = 0;
	for (;;) {
		const persons = await prisma.person.findMany({
			select: { actorId: true },
			orderBy: { actorId: 'asc' },
			take: BATCH,
			...(cursor ? { skip: 1, cursor: { actorId: cursor } } : {})
		});
		if (persons.length === 0) break;
		const ids = persons.map((p) => p.actorId);
		const changes = await prisma.$transaction((tx) => recomputeTrust(tx, ids), { timeout: 60_000 });
		processed += ids.length;
		changed += changes.length;
		cursor = ids.at(-1);
	}
	return { processed, changed };
}
