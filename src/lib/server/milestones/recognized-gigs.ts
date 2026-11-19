/**
 * Concerts **reconnus** d'un interprète (Q106, D79, conception 02 §4).
 *
 * Une collaboration `GIG` terminée n'est pas, à elle seule, la preuve d'un
 * concert : elle l'est quand `gig.held` a été émis, c'est-à-dire quand une
 * personne qui joue et une gestion distincte de l'hôte l'ont confirmée
 * (`verifyGigFromCollaboration`, `verifySoloGigFromCollaboration`). Sans
 * `gig.held` (membre parti avant la confirmation, D75 §8 ; gestion de
 * l'hôte absente), la collaboration garde ses gains mais ne compte ni comme
 * date antérieure (`firstDateIds`) ni dans une tournée (`firstTour`).
 *
 * L'interprète (groupe, ou personne en son nom depuis P8) est lu dans
 * `performerIds`, jamais dans `actorIds` seul : une personne nommée parce
 * qu'elle confirme ou organise le concert d'un groupe n'y gagne aucune date
 * en son nom (DC4).
 *
 * Imports de types seulement : le module sert au service des étapes et à la
 * carte de carrière sans les relier.
 */
import type { Prisma, PrismaClient } from '@prisma/client';

type Db = Prisma.TransactionClient | PrismaClient;

/** Identifiants des collaborations `GIG` reconnues pour `performerId`. */
export async function recognizedGigIds(db: Db, performerId: string): Promise<string[]> {
	const events = await db.domainEvent.findMany({
		where: { type: 'gig.held', actorIds: { has: performerId } },
		select: { payload: true }
	});
	const ids = new Set<string>();
	for (const { payload } of events) {
		const p = payload as { gigId?: unknown; performerIds?: unknown };
		if (typeof p.gigId !== 'string' || !Array.isArray(p.performerIds)) continue;
		if (p.performerIds.includes(performerId)) ids.add(p.gigId);
	}
	return [...ids];
}
