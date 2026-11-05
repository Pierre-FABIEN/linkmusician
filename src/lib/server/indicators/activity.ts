/**
 * Relevé d'activité (P1-13, D13) : « cette personne est venue ce jour-là »,
 * une ligne par jour au plus. Rien d'autre (ni page, ni durée).
 */
import { prisma } from '#lib/server';
import { parisDay } from '#lib/metrics/indicators';

/** Déjà enregistré par cette instance aujourd'hui : évite une écriture par requête. */
const seen = new Set<string>();
let seenDay = '';

export async function recordActivity(actorId: string, now = new Date()): Promise<void> {
	const day = parisDay(now);
	if (day !== seenDay) {
		seen.clear();
		seenDay = day;
	}
	if (seen.has(actorId)) return;
	seen.add(actorId);
	try {
		await prisma.actorActivityDay.createMany({
			data: [{ actorId, day: new Date(`${day}T00:00:00Z`) }],
			skipDuplicates: true
		});
	} catch (error) {
		// Un relevé manqué ne doit jamais bloquer l'espace.
		seen.delete(actorId);
		console.error('Relevé d’activité impossible :', error);
	}
}
