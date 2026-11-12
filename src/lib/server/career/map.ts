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
 * Célébration d'épreuve (P2-11) : une seule fois par acte
 * (`Person.actsCelebrated`).
 */
import { prisma } from '#lib/server';
import { getMusicianTier } from '#lib/server/progression/read';
import { actTitle, actsToCelebrate, careerMap, type CareerFacts } from '#lib/career/map';
import type { AmbitionValue } from '#lib/career/ambition';

/** Étapes de groupe qui comptent sur la carte (actes III et V). */
const SCENE_MILESTONES = ['FIRST_RECORDING', 'FIRST_GIG', 'FIRST_TOUR'] as const;
type SceneMilestone = (typeof SCENE_MILESTONES)[number];

/**
 * Groupes, par étape, dont une attestation au moins corroborée crédite la
 * personne (membre à la date de l'étape).
 */
function creditedBands(events: { payload: unknown }[], actorId: string) {
	const out = Object.fromEntries(SCENE_MILESTONES.map((k) => [k, new Set<string>()])) as Record<
		SceneMilestone,
		Set<string>
	>;
	for (const e of events) {
		const p = e.payload as {
			milestone?: string;
			bandId?: string;
			to?: string;
			memberIds?: string[];
		};
		if (!p.bandId || p.to === 'DECLARED' || !p.memberIds?.includes(actorId)) continue;
		out[p.milestone as SceneMilestone]?.add(p.bandId);
	}
	return out;
}

/** L'étape doit être toujours là (pas retirée par une contestation) et non gelée. */
async function countMilestones(
	bands: Set<string>,
	key: SceneMilestone,
	proofs: ('CORROBORATED' | 'VERIFIED')[]
) {
	if (bands.size === 0) return 0;
	return prisma.milestone.count({
		where: {
			bandId: { in: [...bands] },
			definitionId: key,
			proof: { in: proofs },
			frozenAt: null
		}
	});
}

async function careerEvidence(actorId: string) {
	const [tier, together, solo, attestations, productions] = await Promise.all([
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
				OR: SCENE_MILESTONES.map((key) => ({ payload: { path: ['milestone'], equals: key } }))
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
	const bands = creditedBands(attestations, actorId);
	const [recordings, verifiedGigs, tours] = await Promise.all([
		countMilestones(bands.FIRST_RECORDING, 'FIRST_RECORDING', ['CORROBORATED', 'VERIFIED']),
		countMilestones(bands.FIRST_GIG, 'FIRST_GIG', ['VERIFIED']),
		countMilestones(bands.FIRST_TOUR, 'FIRST_TOUR', ['VERIFIED'])
	]);
	return {
		tier,
		gigBands: [...bands.FIRST_GIG],
		facts: {
			jamAppreciations: tier.summary.jamAppreciations,
			collaborations: tier.summary.collaborations,
			worksTogether: together,
			worksSolo: solo,
			recordings,
			productions,
			verifiedGigs,
			tours
		} satisfies CareerFacts
	};
}

/**
 * Carte souvenir de l'acte V (P5-08) : le premier concert vérifié, avec le
 * groupe, l'hôte et la date. Seulement des faits publics (la page du groupe
 * montre l'étape, l'hôte est une organisation publique). `null` si l'acte
 * n'est pas franchi.
 */
export async function firstVerifiedGig(actorId: string) {
	const { gigBands } = await careerEvidence(actorId);
	if (gigBands.length === 0) return null;
	const milestone = await prisma.milestone.findFirst({
		where: {
			bandId: { in: gigBands },
			definitionId: 'FIRST_GIG',
			proof: 'VERIFIED',
			frozenAt: null
		},
		orderBy: { occurredAt: 'asc' },
		select: { bandId: true, occurredAt: true, band: { select: { displayName: true } } }
	});
	if (!milestone) return null;
	const gig = await prisma.collaboration.findFirst({
		where: {
			bandId: milestone.bandId,
			kind: 'GIG',
			status: 'COMPLETED',
			hostOrg: { verifiedAt: { not: null } }
		},
		orderBy: { happenedOn: 'asc' },
		select: { hostOrg: { select: { actor: { select: { displayName: true } } } } }
	});
	return {
		bandName: milestone.band.displayName,
		hostName: gig?.hostOrg?.actor.displayName ?? null,
		occurredAt: milestone.occurredAt
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
