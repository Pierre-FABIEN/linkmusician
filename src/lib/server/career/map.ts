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
 *   groupe qui le porte.
 *
 * Célébration d'épreuve (P2-11) : une seule fois par acte
 * (`Person.actsCelebrated`).
 */
import { prisma } from '#lib/server';
import { getMusicianTier } from '#lib/server/progression/read';
import { actTitle, actsToCelebrate, careerMap, type CareerFacts } from '#lib/career/map';
import type { AmbitionValue } from '#lib/career/ambition';

async function careerEvidence(actorId: string) {
	const [tier, together, solo, recordingEvents, productions] = await Promise.all([
		getMusicianTier(actorId, prisma),
		prisma.workContributor.count({
			where: {
				personId: actorId,
				confirmedAt: { not: null },
				work: { state: 'COMPOSED', proof: 'CORROBORATED' }
			}
		}),
		prisma.workContributor.count({
			where: {
				personId: actorId,
				confirmedAt: { not: null },
				work: { state: 'COMPOSED', proof: 'DECLARED' }
			}
		}),
		prisma.domainEvent.findMany({
			where: {
				type: 'milestone.attested',
				actorIds: { has: actorId },
				payload: { path: ['milestone'], equals: 'FIRST_RECORDING' }
			},
			select: { payload: true }
		}),
		prisma.work.count({
			where: {
				producedAt: { not: null },
				OR: [
					{
						contributors: {
							some: {
								personId: actorId,
								confirmedAt: { not: null },
								roles: {
									some: { kind: { in: ['INSTRUMENT', 'COMPOSITION', 'LYRICS', 'ARRANGEMENT'] } }
								}
							}
						}
					},
					{
						owner: {
							organization: {
								kind: 'BAND',
								memberships: { some: { personId: actorId, status: 'ACTIVE' } }
							}
						}
					}
				]
			}
		})
	]);
	// Attestations où la personne est créditée, au moins corroborées.
	const bands = new Set(
		recordingEvents
			.map((e) => e.payload as { bandId?: string; to?: string; memberIds?: string[] })
			.filter((p) => p.bandId && p.to !== 'DECLARED' && p.memberIds?.includes(actorId))
			.map((p) => p.bandId!)
	);
	// L'étape doit être toujours là (pas retirée par une contestation) et non gelée.
	const recordings = bands.size
		? await prisma.milestone.count({
				where: {
					bandId: { in: [...bands] },
					definitionId: 'FIRST_RECORDING',
					proof: { in: ['CORROBORATED', 'VERIFIED'] },
					frozenAt: null
				}
			})
		: 0;
	return {
		tier,
		facts: {
			jamAppreciations: tier.summary.jamAppreciations,
			collaborations: tier.summary.collaborations,
			worksTogether: together,
			worksSolo: solo,
			recordings,
			productions
		} satisfies CareerFacts
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
