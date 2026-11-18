/**
 * Carte de carrière (P3-13) : lit les **faits** prouvés d'une personne et en
 * déduit ses actes (`#lib/career/map`). Jamais l'XP.
 *
 * - Acte I : appréciations reçues après une jam (non reprises), ou
 *   collaborations confirmées (résumé des événements, `getMusicianTier`) ;
 * - acte II : morceaux composés à plusieurs (corroborés) où l'on est
 *   crédité·e et confirmé·e ; un morceau composé seul·e ne suffit pas ;
 * - acte III : « Premier enregistrement » corroboré d'un groupe dont on était
 *   membre à la date (attestation `milestone.attested`, étape toujours là et
 *   non gelée) ; vérifié par l'ingé son ou le studio depuis P4-09 ;
 * - acte IV (P4-10) : morceau **produit** (collaboration de production
 *   terminée, donc confirmée par le ou la producteur·rice) où l'on joue ou
 *   écrit (crédit confirmé hors rôles du son) ou dont on est membre du
 *   groupe qui le porte ;
 * - acte V (P5-08) : « Premier concert » **vérifié** (hôte vérifié, P5-06)
 *   d'un groupe dont on était membre à la date ; la « Première tournée »
 *   vérifiée est une épreuve de plus, affichée, pas bloquante.
 *
 * Les faits viennent de la lecture unifiée des réalisations (N1,
 * `./realisations`) : un fait vu depuis deux contextes (crédité·e sur un
 * morceau du groupe dont on est membre) ne compte qu'une fois.
 *
 * Célébration d'épreuve (P2-11) : une seule fois par acte
 * (`Person.actsCelebrated`).
 */
import { prisma } from '#lib/server';
import { actTitle, actsToCelebrate, careerMap, type CareerFacts } from '#lib/career/map';
import type { AmbitionValue } from '#lib/career/ambition';
import { careerFactsOf, firstVerifiedGigOf } from '#lib/career/realisations';
import { readRealisations } from './realisations';

/**
 * Faits de la carte, depuis la lecture unifiée des réalisations (N1) : six
 * requêtes SQL au lieu de huit, mêmes résultats (`realisations.integration.test.ts`).
 */
async function careerEvidence(actorId: string) {
	const read = await readRealisations(actorId);
	return {
		...read,
		facts: careerFactsOf(read.realisations, read.tier.summary)
	};
}

/**
 * Carte souvenir de l'acte V (P5-08) : le premier concert vérifié, avec le
 * groupe, l'hôte et la date. Seulement des faits publics (la page du groupe
 * montre l'étape, l'hôte est une organisation publique). `null` si l'acte
 * n'est pas franchi.
 */
export async function firstVerifiedGig(actorId: string) {
	const { realisations } = await readRealisations(actorId);
	const first = firstVerifiedGigOf(realisations);
	if (!first || first.object.type !== 'MILESTONE' || !first.occurredAt) return null;
	const { bandId } = first.object;
	const [band, gig] = await Promise.all([
		prisma.actor.findUniqueOrThrow({ where: { id: bandId }, select: { displayName: true } }),
		prisma.collaboration.findFirst({
			where: {
				bandId,
				kind: 'GIG',
				status: 'COMPLETED',
				hostOrg: { verifiedAt: { not: null } }
			},
			orderBy: { happenedOn: 'asc' },
			select: { hostOrg: { select: { actor: { select: { displayName: true } } } } }
		})
	]);
	return {
		bandName: band.displayName,
		hostName: gig?.hostOrg?.actor.displayName ?? null,
		occurredAt: first.occurredAt
	};
}

export async function careerFacts(actorId: string): Promise<CareerFacts> {
	return (await careerEvidence(actorId)).facts;
}

export async function careerEvidenceForSheet(actorId: string) {
	return careerEvidence(actorId);
}

export async function careerMapFor(actorId: string, ambition: AmbitionValue | null) {
	return careerMap(await careerFacts(actorId), ambition);
}

/**
 * Épreuves franchies pas encore fêtées : renvoyées pour les célébrations, et
 * aussitôt marquées comme fêtées. `hasNews` : il y a eu du neuf depuis la
 * dernière visite (sans gain, aucune épreuve n'a pu être franchie).
 */
export async function pendingActCelebrations(actorId: string, hasNews: boolean) {
	if (!hasNews) return [];
	const person = await prisma.person.findUnique({
		where: { actorId },
		select: { actsCelebrated: true }
	});
	if (!person) return [];
	const map = careerMap(await careerFacts(actorId));
	const fresh = actsToCelebrate(map.passed, person.actsCelebrated);
	if (fresh.length === 0) return [];
	await prisma.person.update({
		where: { actorId },
		data: { actsCelebrated: [...new Set([...person.actsCelebrated, ...fresh])] }
	});
	return fresh.map((n) => ({
		id: `act-${n}`,
		kind: 'act' as const,
		title: `Épreuve franchie : ${actTitle(n)}`,
		detail: 'Ta carte de carrière avance. Regarde ce qui s’ouvre.'
	}));
}
