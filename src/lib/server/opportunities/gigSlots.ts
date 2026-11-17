/**
 * Plateaux (P5-05a, conception 08 §8) : un·e organisateur·rice publie une
 * date dans un lieu de l'annuaire et cherche des groupes ; une personne qui
 * gère un groupe candidate **au nom du groupe**. Règles pures dans
 * `#lib/opportunities/gigSlot`.
 *
 * - Publier : métier « Organisateur·rice », majeur·e (D5), ville indiquée,
 *   lieu validé (D26). Aucune XP à la publication (02 §8) : l'événement
 *   tenu et confirmé par les groupes rapportera (P5-06).
 * - Candidater : conditions revérifiées ici (rang du groupe, genre, zone),
 *   **jamais l'XP**. Un groupe hors conditions ne peut pas candidater. La
 *   personne qui envoie est retenue (`sentById`) : à l'acceptation, la
 *   conversation s'ouvre avec elle (`decideApplication`).
 * - Mineur·es (D5, Q31) : on ne candidate pas à un plateau avant 18 ans ;
 *   un·e adulte qui gère le groupe le fait.
 */
import { prisma } from '#lib/server';
import { qualifiedTable } from '#lib/server/db-schema';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { checkStockQuota } from '#lib/server/trust/quotas';
import { getActorLocation } from '#lib/server/geo/queries';
import { getVenue } from '#lib/server/venues/service';
import { isAdult } from '#lib/server/jam/publicJams';
import { bandTierOf } from '#lib/server/milestones/service';
import { managedBands } from '#lib/server/bands/service';
import { notify } from '#lib/server/notifications/service';
import type { MilestoneKey } from '#lib/milestones/rules';
import {
	GIG_TIER_LABELS,
	GIG_TIER_OPTIONS,
	UNMET_GIG_LABELS,
	checkGigDate,
	unknownGigConditions,
	unmetGigConditions,
	type BandFacts,
	type GigSlotInput
} from '#lib/opportunities/gigSlot';
import { isActive, type OpportunityStatusValue } from '#lib/opportunities/rules';
import type { ApplicationStatusValue } from '#lib/opportunities/applications';
import { OpportunityError, managesIssuer } from './service';
import { checkedMessage, withdrawApplication } from './applications';
import { gigSlotGaps } from '#lib/organizations/promoter';
import {
	UNKNOWN_LABELS,
	completeLinks,
	normalizeQualification
} from '#lib/opportunities/qualification';
import type { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient | typeof prisma;

export const NOT_PROMOTER_ERROR =
	'Ajoute d’abord le métier « Organisateur·rice » pour publier un plateau.';

/** Peut publier un plateau : le métier Organisateur·rice, et majeur·e (D5). */
export async function isPromoter(personId: string) {
	const track = await prisma.personTrack.count({ where: { personId, track: 'PROMOTER' } });
	return track > 0 && (await isAdult(personId));
}

/**
 * Organisation au nom de laquelle publier, que la personne gère (OWNER,
 * ADMIN) : une organisation `PROMOTER` (P5-05b) avec une ville et un type
 * d'événement, ou un lieu `VENUE` (P5-03b) dont la fiche est publiée, et
 * qui publie chez lui. Sinon, une erreur qui dit ce qui manque.
 */
async function requireIssuerOrg(personId: string, orgId: string) {
	const org = await prisma.organization.findFirst({
		where: {
			actorId: orgId,
			kind: { in: ['PROMOTER', 'VENUE'] },
			dissolvedAt: null,
			actor: { deletedAt: null },
			memberships: {
				some: { personId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } }
			}
		},
		select: {
			kind: true,
			promoter: { select: { eventKinds: true } },
			venueProfile: { select: { publishedAt: true } },
			venueClaims: { where: { status: 'APPROVED' }, take: 1, select: { venueId: true } }
		}
	});
	if (!org) {
		throw new OpportunityError(
			'Seules les personnes qui gèrent l’organisation publient en son nom.',
			403
		);
	}
	if (org.kind === 'VENUE') {
		if (!org.venueProfile?.publishedAt) {
			throw new OpportunityError('Publie d’abord la fiche du lieu.');
		}
		return { kind: 'VENUE' as const, venueId: org.venueClaims[0]?.venueId ?? null };
	}
	const gaps = gigSlotGaps({
		hasCommune: (await getActorLocation(orgId)) !== null,
		eventKinds: org.promoter?.eventKinds ?? []
	});
	if (gaps.length > 0) {
		throw new OpportunityError(`Complète d’abord la fiche de l’organisation : ${gaps.join(', ')}.`);
	}
	return { kind: 'PROMOTER' as const, venueId: null };
}

/**
 * Publier un plateau, en son nom ou au nom d'une organisation que l'on gère
 * (P5-05b, ou un lieu, P5-03b) : l'organisation est l'émettrice, la personne est notée
 * (`postedById`) ; la zone est la ville de l'organisation ; le quota est
 * celui de la personne, compté sur les plateaux de l'émetteur.
 */
export async function createGigSlot(
	personId: string,
	form: GigSlotInput,
	now = new Date(),
	orgId: string | null = null
) {
	const issuerId = orgId ?? personId;
	const org = orgId ? await requireIssuerOrg(personId, orgId) : null;
	// Un lieu publie ses dates sans le métier d'organisateur·rice (Q34) ; il
	// faut être majeur·e (D5), et c'est chez lui.
	if (org?.kind === 'VENUE') {
		if (!(await isAdult(personId)))
			throw new OpportunityError('Il faut être majeur·e pour publier une date.', 403);
		if (form.venueId !== org.venueId) {
			throw new OpportunityError('Un lieu publie ses dates chez lui.');
		}
	} else if (!(await isPromoter(personId))) {
		throw new OpportunityError(NOT_PROMOTER_ERROR, 403);
	}
	if (!orgId && !(await getActorLocation(personId))) {
		throw new OpportunityError('Indique d’abord ta ville : un plateau se diffuse autour de toi.');
	}
	const date = checkGigDate(form, now);
	if (!date.ok) throw new OpportunityError(date.error);
	// Un plateau se tient dans un lieu validé de l'annuaire (D26).
	const venue = await getVenue(form.venueId, personId);
	if (!venue || !venue.validated) {
		throw new OpportunityError('Ce lieu n’est pas (encore) dans l’annuaire validé.');
	}
	const genre = form.genre
		? await prisma.genre.findFirst({ where: { slug: form.genre, active: true } })
		: null;
	if (form.genre && !genre) throw new OpportunityError('Genre inconnu.');
	if (form.minBandTier && !GIG_TIER_OPTIONS.some((t) => t.id === form.minBandTier)) {
		throw new OpportunityError('Rang inconnu.');
	}
	// Conditions (ONB-13b, D63) : cachet, formation, répertoire.
	const qualification = normalizeQualification('gig', form);
	if (!qualification.ok) throw new OpportunityError(qualification.message);
	const active = await prisma.opportunity.count({
		where: { issuerActorId: issuerId, status: 'OPEN', expiresAt: { gt: now } }
	});
	const quota = await checkStockQuota(personId, 'activeOpportunities', active);
	if (!quota.allowed) {
		throw new OpportunityError(
			`Tu as déjà ${quota.limit} annonce${quota.limit > 1 ? 's' : ''} active${quota.limit > 1 ? 's' : ''}. Clôture-en une, ou attends que ta confiance grandisse.`,
			429
		);
	}
	// Aucune XP ici (02 §8). Les candidatures ferment au début du plateau.
	return prisma.opportunity.create({
		data: {
			issuerActorId: issuerId,
			postedById: orgId ? personId : null,
			kind: 'GIG_SLOT',
			title: form.title,
			description: form.description,
			venueId: venue.id,
			startsAt: date.startsAt,
			slots: form.slots,
			genreSlug: genre?.slug ?? null,
			minBandTier: form.minBandTier ?? null,
			radiusKm: form.radiusKm,
			expiresAt: date.startsAt,
			...qualification.value
		},
		select: { id: true }
	});
}

/** Distance entre deux acteurs (centroïdes de commune floutés), en km ; `null` sans ville. */
async function distanceKm(a: string, b: string, db: Db = prisma): Promise<number | null> {
	const t = qualifiedTable('actor_locations');
	const rows = await db.$queryRaw<{ meters: number }[]>`
		SELECT public.ST_Distance(x.point, y.point)::float8 AS meters
		FROM ${t} x JOIN ${t} y ON y."actorId" = ${b}
		WHERE x."actorId" = ${a}`;
	return rows[0] ? rows[0].meters / 1000 : null;
}

/** Ce que l'on sait d'un groupe pour un plateau : rang prouvé, genres, distance. */
export async function bandFacts(
	bandId: string,
	issuerId: string,
	db: Db = prisma
): Promise<BandFacts> {
	const [tier, genres, distance, profile] = await Promise.all([
		bandTierOf(bandId, db),
		db.actorGenre.findMany({
			where: { actorId: bandId },
			select: { genre: { select: { slug: true, parent: { select: { slug: true } } } } }
		}),
		distanceKm(bandId, issuerId, db),
		// ONB-13b : formation et répertoire déclarés (D64), `null` si non précisé.
		db.bandProfile.findUnique({
			where: { orgId: bandId },
			select: { formation: true, repertoire: true }
		})
	]);
	return {
		formation: profile?.formation ?? null,
		repertoire: profile?.repertoire ?? null,
		tier: (tier?.id as MilestoneKey | undefined) ?? null,
		genreSlugs: [
			...new Set(
				genres.flatMap((g) => [g.genre.slug, ...(g.genre.parent ? [g.genre.parent.slug] : [])])
			)
		],
		distanceKm: distance
	};
}

type GigRow = {
	id: string;
	kind: string;
	status: string;
	expiresAt: Date;
	issuerActorId: string;
	title: string;
	genreSlug: string | null;
	minBandTier: string | null;
	radiusKm: number;
	formation: BandFacts['formation'];
	repertoire: BandFacts['repertoire'];
};

async function gigOrThrow(opportunityId: string, db: Db = prisma): Promise<GigRow> {
	const o = await db.opportunity.findUnique({
		where: { id: opportunityId },
		select: {
			id: true,
			kind: true,
			status: true,
			expiresAt: true,
			issuerActorId: true,
			title: true,
			genreSlug: true,
			minBandTier: true,
			radiusKm: true,
			formation: true,
			repertoire: true
		}
	});
	if (!o || o.kind !== 'GIG_SLOT' || o.status === 'REMOVED') {
		throw new OpportunityError('Plateau introuvable.', 404);
	}
	return o;
}

const conditionsOf = (o: GigRow) => ({
	minBandTier: o.minBandTier,
	genre: o.genreSlug,
	radiusKm: o.radiusKm,
	formation: o.formation,
	repertoire: o.repertoire
});

/** Conditions non remplies et non précisées (ONB-13b), en mots. */
export async function checkBand(o: GigRow, bandId: string, db: Db = prisma) {
	const facts = await bandFacts(bandId, o.issuerActorId, db);
	const unknownCriteria = unknownGigConditions(conditionsOf(o), facts);
	return {
		unmet: unmetGigConditions(conditionsOf(o), facts).map((u) => UNMET_GIG_LABELS[u]),
		unknown: unknownCriteria.map((u) => UNKNOWN_LABELS[u]),
		unknownCriteria
	};
}

/**
 * Les groupes que je gère, face à un plateau : leur rang, les conditions
 * qu'ils ne remplissent pas, et leur candidature s'il y en a une.
 */
export async function bandOptionsFor(personId: string, opportunityId: string) {
	const o = await gigOrThrow(opportunityId);
	const bands = await managedBands(personId);
	const applications = await prisma.application.findMany({
		where: { opportunityId, applicantActorId: { in: bands.map((b) => b.id) } },
		select: {
			id: true,
			applicantActorId: true,
			status: true,
			conversationId: true,
			delegated: true
		}
	});
	return Promise.all(
		bands.map(async (b) => {
			const [tier, { unmet, unknown, unknownCriteria }] = await Promise.all([
				bandTierOf(b.id),
				checkBand(o, b.id)
			]);
			const app = applications.find((a) => a.applicantActorId === b.id);
			return {
				handle: b.handle,
				name: b.name,
				tier: tier?.label ?? null,
				unmet,
				unknown,
				// Je gère ce groupe : je peux compléter sa fiche (ONB-12c3).
				complete: completeLinks(unknownCriteria, { opportunityId, bandHandle: b.handle }),
				application: app
					? {
							id: app.id,
							status: app.status as ApplicationStatusValue,
							conversationId: app.delegated ? null : app.conversationId
						}
					: null
			};
		})
	);
}

/** Candidater à un plateau au nom d'un groupe que je gère. */
export async function applyAsBand(
	personId: string,
	opportunityId: string,
	bandHandle: string,
	raw: string,
	now = new Date()
) {
	const o = await gigOrThrow(opportunityId);
	if (await managesIssuer(personId, o.issuerActorId))
		throw new OpportunityError('C’est ton plateau.');
	if (!isActive({ status: o.status as OpportunityStatusValue, expiresAt: o.expiresAt }, now)) {
		throw new OpportunityError('Ce plateau n’est plus ouvert.');
	}
	const issuerVisible = await prisma.actor.count({
		where: { id: o.issuerActorId, ...publicActorWhere(now, personId) }
	});
	if (issuerVisible === 0) throw new OpportunityError('Plateau introuvable.', 404);
	if (!(await isAdult(personId))) {
		throw new OpportunityError(
			'Avant 18 ans, on ne candidate pas à un plateau : un·e adulte qui gère le groupe peut le faire.',
			403
		);
	}
	const band = (await managedBands(personId)).find((b) => b.handle === bandHandle);
	if (!band)
		throw new OpportunityError('Seules les personnes qui gèrent le groupe candidatent.', 403);
	const existing = await prisma.application.findUnique({
		where: { opportunityId_applicantActorId: { opportunityId, applicantActorId: band.id } }
	});
	if (existing) throw new OpportunityError('Ce groupe a déjà candidaté à ce plateau.');
	const { unmet } = await checkBand(o, band.id);
	if (unmet.length > 0) {
		throw new OpportunityError(`Ce groupe ne peut pas candidater : ${unmet.join(', ')}.`);
	}
	const message = checkedMessage(raw);
	return prisma.$transaction(async (tx) => {
		// ONB-13b : plateau verrouillé puis relu, conditions revérifiées ici
		// (clôture, fiche du groupe modifiée, envoi simultané).
		await tx.$queryRaw`SELECT id FROM ${qualifiedTable('opportunities')} WHERE id = ${opportunityId} FOR UPDATE`;
		const fresh = await gigOrThrow(opportunityId, tx);
		if (
			!isActive({ status: fresh.status as OpportunityStatusValue, expiresAt: fresh.expiresAt }, now)
		) {
			throw new OpportunityError('Ce plateau n’est plus ouvert.');
		}
		const twice = await tx.application.count({
			where: { opportunityId, applicantActorId: band.id }
		});
		if (twice > 0) throw new OpportunityError('Ce groupe a déjà candidaté à ce plateau.');
		const again = await checkBand(fresh, band.id, tx);
		if (again.unmet.length > 0) {
			throw new OpportunityError(`Ce groupe ne peut pas candidater : ${again.unmet.join(', ')}.`);
		}
		const created = await tx.application.create({
			data: { opportunityId, applicantActorId: band.id, sentById: personId, message },
			select: { id: true }
		});
		// Plateau d'une organisation (P5-05b) : toute sa gestion est prévenue.
		const managers = await tx.membership.findMany({
			where: {
				orgId: o.issuerActorId,
				status: 'ACTIVE',
				role: { in: ['OWNER', 'ADMIN'] }
			},
			select: { personId: true }
		});
		const recipients = managers.length ? managers.map((m) => m.personId) : [o.issuerActorId];
		for (const recipientId of recipients) {
			await notify(tx, {
				recipientId,
				type: 'APPLICATION_RECEIVED',
				fromActorId: band.id,
				href: `/annonces/${opportunityId}`,
				title: o.title
			});
		}
		return created;
	});
}

/** Retirer la candidature d'un groupe : la personne qui l'a envoyée, ou la gestion du groupe. */
export async function withdrawBandApplication(personId: string, applicationId: string) {
	await withdrawApplication(personId, applicationId);
}

/** Libellé d'un rang de groupe demandé (`FIRST_GIG` → « Live »). */
export const gigTierLabel = (id: string | null) =>
	id ? (GIG_TIER_LABELS[id as MilestoneKey] ?? null) : null;
