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
 * Carte parallèle (N2) : en plus des faits, `careerMapFor` lit les **faits
 * déclencheurs** des seules épreuves non franchies (collaborations à
 * confirmer, rôle en attente sur un morceau déclaré, premier enregistrement
 * déclaré d'un de ses groupes) ; aucun n'est une valeur de progression.
 *
 * Célébration d'épreuve (P2-11) : une seule fois par épreuve
 * (`Person.actsCelebrated`, numéro interne inchangé).
 */
import { prisma } from '#lib/server';
import {
	actTitle,
	actsToCelebrate,
	careerMap,
	corroboratedGigOf,
	NO_REACH,
	type CareerBranch,
	type CareerFacts,
	type ReachFacts
} from '#lib/career/map';
import type { AmbitionValue } from '#lib/career/ambition';
import { careerFactsOf, firstVerifiedGigOf } from '#lib/career/realisations';
import { isManager } from '#lib/bands/rules';
import { parisDay } from '#lib/metrics/indicators';
import { readRealisations } from './realisations';
import { requestMemo, type RequestScope } from '#lib/server/request-memo';

/**
 * Faits de la carte, depuis la lecture unifiée des réalisations (N1) : six
 * requêtes SQL au lieu de huit, mêmes résultats (`realisations.integration.test.ts`).
 */
function careerEvidence(actorId: string, scope?: RequestScope) {
	// N3 : une lecture par requête HTTP, partagée par le layout (célébrations),
	// la carte et les prochaines actions ; jamais entre deux requêtes.
	return requestMemo(scope, `career:evidence:${actorId}`, async () => {
		const read = await readRealisations(actorId);
		return {
			...read,
			facts: careerFactsOf(read.realisations, read.tier.summary)
		};
	});
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

export async function careerFacts(actorId: string, scope?: RequestScope): Promise<CareerFacts> {
	return (await careerEvidence(actorId, scope)).facts;
}

export async function careerEvidenceForSheet(actorId: string) {
	return careerEvidence(actorId);
}

/**
 * Collaborations passées, acceptées par tous, qui n'attendent plus que la
 * confirmation de l'acteur (`nextStep` = `confirm`, `#lib/collaborations/rules`).
 * Une lecture à plat ; les détails (prestation, hôte vérifié, côté du groupe)
 * ne se lisent, en parallèle, que s'il y a des lignes : Prisma lancerait sinon
 * une requête par relation, même vide.
 */
async function collaborationsToConfirm(actorId: string, now: Date) {
	const rows = await prisma.collaboration.findMany({
		where: {
			status: 'ACCEPTED',
			happenedOn: { lte: new Date(parisDay(now)) },
			participants: {
				some: {
					actorId,
					acceptedAt: { not: null },
					confirmedCompletionAt: null,
					declinedAt: null,
					cancelledAt: null
				}
			}
		},
		orderBy: [{ happenedOn: 'asc' }, { id: 'asc' }],
		take: 10,
		select: {
			id: true,
			kind: true,
			title: true,
			happenedOn: true,
			workId: true,
			hostOrgId: true,
			bandId: true
		}
	});
	if (rows.length === 0) return [];
	const hostIds = [...new Set(rows.flatMap((c) => (c.hostOrgId ? [c.hostOrgId] : [])))];
	const bandIds = [...new Set(rows.flatMap((c) => (c.bandId ? [c.bandId] : [])))];
	const [mine, hosts, memberships] = await Promise.all([
		prisma.collaborationParticipant.findMany({
			where: { actorId, collaborationId: { in: rows.map((c) => c.id) } },
			select: { collaborationId: true, service: true }
		}),
		hostIds.length
			? prisma.actor.findMany({
					where: { id: { in: hostIds }, organization: { verifiedAt: { not: null } } },
					select: { id: true, displayName: true }
				})
			: [],
		bandIds.length
			? prisma.membership.findMany({
					where: { personId: actorId, status: 'ACTIVE', orgId: { in: bandIds } },
					select: { orgId: true }
				})
			: []
	]);
	const provider = new Set(mine.filter((p) => p.service !== null).map((p) => p.collaborationId));
	const verifiedHost = new Map(hosts.map((h) => [h.id, h.displayName]));
	const memberOf = new Set(memberships.map((m) => m.orgId));
	return rows.map((c) => ({
		id: c.id,
		kind: c.kind,
		title: c.title,
		happenedOn: c.happenedOn.toISOString().slice(0, 10),
		asProvider: provider.has(c.id),
		bandSide: c.bandId !== null && memberOf.has(c.bandId),
		verifiedHostName: (c.hostOrgId && verifiedHost.get(c.hostOrgId)) || null,
		hasWork: c.workId !== null
	}));
}

/**
 * Morceaux composés, déclarés, où l'acteur est confirmé·e et où un autre rôle
 * attend sa confirmation (à deux crédits confirmés, le morceau est corroboré :
 * `proofFor`, `#lib/works/rules`). Une seule requête.
 */
async function pendingCoauthors(actorId: string) {
	return (
		await prisma.work.findMany({
			where: {
				state: 'COMPOSED',
				proof: 'DECLARED',
				owner: { deletedAt: null },
				AND: [
					{ contributors: { some: { personId: actorId, confirmedAt: { not: null } } } },
					{ contributors: { some: { personId: { not: actorId }, confirmedAt: null } } }
				]
			},
			orderBy: [{ composedAt: 'asc' }, { id: 'asc' }],
			take: 3,
			select: { id: true, title: true }
		})
	).map((w) => ({ workId: w.id, title: w.title }));
}

/**
 * « Premier enregistrement » déclaré, non gelé, des groupes dont l'acteur est
 * membre actif. Lecture à plat ; le nom du groupe et le rôle de l'acteur ne
 * se lisent que s'il y a des lignes.
 */
async function declaredRecordings(actorId: string) {
	const rows = await prisma.milestone.findMany({
		where: {
			definitionId: 'FIRST_RECORDING',
			proof: 'DECLARED',
			frozenAt: null,
			band: {
				deletedAt: null,
				organization: {
					kind: 'BAND',
					dissolvedAt: null,
					memberships: { some: { personId: actorId, status: 'ACTIVE' } }
				}
			}
		},
		orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
		take: 3,
		select: { bandId: true }
	});
	if (rows.length === 0) return [];
	const bandIds = rows.map((m) => m.bandId);
	const [bands, roles] = await Promise.all([
		prisma.actor.findMany({
			where: { id: { in: bandIds } },
			select: { id: true, handle: true, displayName: true }
		}),
		prisma.membership.findMany({
			where: { personId: actorId, status: 'ACTIVE', orgId: { in: bandIds } },
			select: { orgId: true, role: true }
		})
	]);
	const band = new Map(bands.map((b) => [b.id, b]));
	const role = new Map(roles.map((r) => [r.orgId, r.role]));
	return bandIds.flatMap((id) => {
		const b = band.get(id);
		return b
			? [{ bandHandle: b.handle, bandName: b.displayName, manager: isManager(role.get(id)) }]
			: [];
	});
}

/**
 * Faits déclencheurs (N2) d'une carte dont les faits sont déjà lus : on ne
 * lit que ce qui peut rendre **à portée** une épreuve encore non franchie.
 * Une personne qui a tout franchi ne paie aucune requête de plus.
 */
async function reachFactsFor(
	actorId: string,
	facts: CareerFacts,
	corroboratedGig: boolean,
	now: Date
): Promise<ReachFacts> {
	const passed = new Set(careerMap(facts).passed);
	const needsCollabs = !passed.has(1) || !passed.has(4) || !passed.has(5);
	const [toConfirm, coauthors, recordings] = await Promise.all([
		needsCollabs ? collaborationsToConfirm(actorId, now) : [],
		!passed.has(2) && facts.worksSolo > 0 ? pendingCoauthors(actorId) : [],
		!passed.has(3) ? declaredRecordings(actorId) : []
	]);
	return {
		...NO_REACH,
		toConfirm,
		pendingCoauthors: coauthors,
		declaredRecordings: recordings,
		corroboratedGig
	};
}

/**
 * Carte parallèle (N2) : faits, puis déclencheurs des épreuves non franchies.
 * Avec `scope` (N3), lue une fois par requête : l'accueil et ses prochaines
 * actions la partagent.
 */
export function careerMapFor(
	actorId: string,
	ambition: AmbitionValue | null,
	now = new Date(),
	scope?: RequestScope
) {
	return requestMemo(scope, `career:map:${actorId}:${ambition ?? ''}`, async () => {
		const { facts, realisations } = await careerEvidence(actorId, scope);
		const reach = await reachFactsFor(actorId, facts, corroboratedGigOf(realisations), now);
		return careerMap(facts, ambition, reach);
	});
}

/**
 * Page d'une branche (N2, conception 21 §10.3) : la carte, plus les
 * réalisations de la branche avec leur preuve et leur titre. Lue à la
 * demande, seulement pour l'acteur lui-même (la carte est privée).
 */
export async function careerBranchFor(
	actorId: string,
	ambition: AmbitionValue | null,
	branch: CareerBranch,
	now = new Date()
) {
	const { facts, realisations } = await careerEvidence(actorId);
	const reach = await reachFactsFor(actorId, facts, corroboratedGigOf(realisations), now);
	const own = realisations.filter((r) => r.branch === branch);
	const workIds = [
		...new Set(
			own.flatMap((r) =>
				r.object.type === 'WORK'
					? [r.object.id]
					: r.object.type === 'WORK_ROLE'
						? [r.object.workId]
						: []
			)
		)
	];
	const bandIds = [
		...new Set(own.flatMap((r) => (r.object.type === 'MILESTONE' ? [r.object.bandId] : [])))
	];
	const [works, bands] = await Promise.all([
		workIds.length
			? prisma.work.findMany({ where: { id: { in: workIds } }, select: { id: true, title: true } })
			: [],
		bandIds.length
			? prisma.actor.findMany({
					where: { id: { in: bandIds } },
					select: { id: true, displayName: true }
				})
			: []
	]);
	return {
		map: careerMap(facts, ambition, reach),
		reach,
		realisations: own,
		titles: {
			works: Object.fromEntries(works.map((w) => [w.id, w.title])),
			bands: Object.fromEntries(bands.map((b) => [b.id, b.displayName]))
		}
	};
}

/**
 * Épreuves franchies pas encore fêtées : renvoyées pour les célébrations, et
 * aussitôt marquées comme fêtées. `hasNews` : il y a eu du neuf depuis la
 * dernière visite (sans gain, aucune épreuve n'a pu être franchie).
 */
export async function pendingActCelebrations(
	actorId: string,
	hasNews: boolean,
	scope?: RequestScope
) {
	if (!hasNews) return [];
	const person = await prisma.person.findUnique({
		where: { actorId },
		select: { actsCelebrated: true }
	});
	if (!person) return [];
	const map = careerMap(await careerFacts(actorId, scope));
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
