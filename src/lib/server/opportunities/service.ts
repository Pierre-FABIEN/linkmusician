/**
 * Annonces (P2-02) : publier, clôturer, lire, lister autour de soi, expirer.
 * Règles pures dans `#lib/opportunities/rules`. Aucune XP à la publication.
 *
 * La zone d'une annonce est la commune de son auteur (`actor_locations`) ;
 * une annonce est visible des personnes situées dans son rayon de diffusion.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { qualifiedTable } from '#lib/server/db-schema';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { checkStockQuota } from '#lib/server/trust/quotas';
import { getActorLocation } from '#lib/server/geo/queries';
import { MUSICIAN_TIERS } from '#lib/server/progression/core/tiers';
import { distanceBand } from '#lib/geo/distance';
import {
	displayStatus,
	expiresAtFor,
	isActive,
	type OpportunityForm,
	type OpportunityKindValue
} from '#lib/opportunities/rules';

export class OpportunityError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

/** Paliers proposés comme condition (libellés pour les formulaires). */
export const TIER_OPTIONS = MUSICIAN_TIERS.map((t) => ({ id: t.id, label: t.label }));
const tierLabel = (id: string | null) => TIER_OPTIONS.find((t) => t.id === id)?.label ?? null;

/** Annonces actives d'une personne (pour le quota). */
async function activeCount(actorId: string, now: Date) {
	return prisma.opportunity.count({
		where: { issuerActorId: actorId, status: 'OPEN', expiresAt: { gt: now } }
	});
}

export async function createOpportunity(actorId: string, form: OpportunityForm, now = new Date()) {
	if (!(await getActorLocation(actorId))) {
		throw new OpportunityError('Indique d’abord ta ville : une annonce se diffuse autour de toi.');
	}
	const quota = await checkStockQuota(
		actorId,
		'activeOpportunities',
		await activeCount(actorId, now)
	);
	if (!quota.allowed) {
		throw new OpportunityError(
			`Tu as déjà ${quota.limit} annonce${quota.limit > 1 ? 's' : ''} active${quota.limit > 1 ? 's' : ''}. Clôture-en une, ou attends que ta confiance grandisse.`,
			429
		);
	}
	const [instrument, genre] = await Promise.all([
		form.instrument
			? prisma.instrument.findFirst({ where: { slug: form.instrument, active: true } })
			: null,
		form.genre ? prisma.genre.findFirst({ where: { slug: form.genre, active: true } }) : null
	]);
	if (form.instrument && !instrument) throw new OpportunityError('Instrument inconnu.');
	if (form.genre && !genre) throw new OpportunityError('Genre inconnu.');
	if (form.minTier && !TIER_OPTIONS.some((t) => t.id === form.minTier)) {
		throw new OpportunityError('Palier inconnu.');
	}
	const startsAt = form.startsAt ? new Date(`${form.startsAt}T12:00:00Z`) : undefined;
	if (startsAt && startsAt.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
		throw new OpportunityError('La date est déjà passée.');
	}
	// Aucune XP ici : la quête rapporte quand elle est remplie (02 §8).
	return prisma.opportunity.create({
		data: {
			issuerActorId: actorId,
			kind: form.kind,
			title: form.title,
			description: form.description,
			instrumentId: instrument?.id ?? null,
			minLevel: form.minLevel ?? null,
			genreSlug: genre?.slug ?? null,
			minTier: form.minTier ?? null,
			radiusKm: form.radiusKm,
			slots: form.slots,
			startsAt: startsAt ?? null,
			expiresAt: expiresAtFor(form.durationDays, now, startsAt)
		},
		select: { id: true }
	});
}

export async function closeOpportunity(actorId: string, id: string) {
	const { count } = await prisma.opportunity.updateMany({
		where: { id, issuerActorId: actorId, status: 'OPEN' },
		data: { status: 'CLOSED', closedAt: new Date() }
	});
	if (count === 0) throw new OpportunityError('Cette annonce n’est plus ouverte.');
}

/**
 * Une annonce, vue par quelqu'un. `null` si elle n'existe pas, si son auteur
 * n'est pas visible (masqué, suspendu, bloqué), ou si elle a été retirée par
 * la modération (sauf pour son auteur).
 */
export async function getOpportunity(id: string, viewerId: string, now = new Date()) {
	const o = await prisma.opportunity.findUnique({
		where: { id },
		include: {
			instrument: { select: { name: true } },
			issuer: {
				select: {
					id: true,
					handle: true,
					displayName: true,
					location: { select: { communeName: true } }
				}
			}
		}
	});
	if (!o) return null;
	const isOwner = o.issuerActorId === viewerId;
	if (!isOwner) {
		if (o.status === 'REMOVED') return null;
		const visible = await prisma.actor.count({
			where: { id: o.issuerActorId, ...publicActorWhere(now, viewerId) }
		});
		if (visible === 0) return null;
	}
	const genre = o.genreSlug
		? await prisma.genre.findUnique({ where: { slug: o.genreSlug }, select: { name: true } })
		: null;
	return {
		id: o.id,
		kind: o.kind as OpportunityKindValue,
		status: displayStatus(o, now),
		active: isActive(o, now),
		title: o.title,
		description: o.description,
		instrument: o.instrument?.name ?? null,
		minLevel: o.minLevel,
		genre: genre?.name ?? null,
		minTier: tierLabel(o.minTier),
		radiusKm: o.radiusKm,
		slots: o.slots,
		startsAt: o.startsAt,
		expiresAt: o.expiresAt,
		createdAt: o.createdAt,
		commune: o.issuer.location?.communeName ?? null,
		issuer: { handle: o.issuer.handle, displayName: o.issuer.displayName },
		isOwner
	};
}

/**
 * Annonces actives autour de moi : je suis dans leur rayon de diffusion,
 * leur auteur est visible et n'est pas séparé de moi par un blocage. Les plus
 * récentes d'abord.
 */
export async function listNearby(
	viewerId: string,
	filters: { kind?: OpportunityKindValue | null } = {},
	now = new Date()
) {
	const t = (name: string) => qualifiedTable(name);
	const kind = filters.kind ? Prisma.sql`AND o.kind::text = ${filters.kind}` : Prisma.empty;
	const rows = await prisma.$queryRaw<{ id: string; meters: number }[]>`
		SELECT o.id, public.ST_Distance(me.point, loc.point)::float8 AS meters
		FROM ${t('opportunities')} o
		JOIN ${t('actors')} a ON a.id = o."issuerActorId"
		JOIN ${t('actor_locations')} loc ON loc."actorId" = a.id
		JOIN ${t('actor_locations')} me ON me."actorId" = ${viewerId}
		WHERE o.status::text = 'OPEN' AND o."expiresAt" > ${now}
			AND a.id <> ${viewerId}
			AND public.ST_DWithin(me.point, loc.point, o."radiusKm" * 1000)
			AND a."deletedAt" IS NULL AND a.hidden = false
			AND NOT EXISTS (
				SELECT 1 FROM ${t('blocks')} b
				WHERE (b."blockerActorId" = ${viewerId} AND b."blockedActorId" = a.id)
					OR (b."blockerActorId" = a.id AND b."blockedActorId" = ${viewerId}))
			AND NOT EXISTS (
				SELECT 1 FROM ${t('sanctions')} s
				WHERE s."actorId" = a.id AND s.kind::text = 'SUSPENSION' AND s."liftedAt" IS NULL
				AND (s.until IS NULL OR s.until > ${now}))
			${kind}
		ORDER BY o."createdAt" DESC
		LIMIT 50`;
	const meters = new Map(rows.map((r) => [r.id, r.meters]));
	const items = await prisma.opportunity.findMany({
		where: { id: { in: rows.map((r) => r.id) } },
		orderBy: { createdAt: 'desc' },
		include: {
			instrument: { select: { name: true } },
			issuer: {
				select: { displayName: true, location: { select: { communeName: true } } }
			}
		}
	});
	return items.map((o) => ({
		id: o.id,
		kind: o.kind as OpportunityKindValue,
		title: o.title,
		instrument: o.instrument?.name ?? null,
		minLevel: o.minLevel,
		slots: o.slots,
		startsAt: o.startsAt,
		issuer: o.issuer.displayName,
		commune: o.issuer.location?.communeName ?? null,
		distance: distanceBand(meters.get(o.id) ?? 0)
	}));
}

/** Mes annonces, toutes, les plus récentes d'abord. */
export async function listMine(actorId: string, now = new Date()) {
	const items = await prisma.opportunity.findMany({
		where: { issuerActorId: actorId },
		orderBy: { createdAt: 'desc' },
		take: 50,
		select: {
			id: true,
			kind: true,
			title: true,
			status: true,
			expiresAt: true,
			createdAt: true,
			// Candidatures à trancher (P2-03).
			_count: {
				select: { applications: { where: { status: { in: ['SENT', 'SEEN', 'SHORTLISTED'] } } } }
			}
		}
	});
	return items.map(({ _count, ...o }) => ({
		...o,
		kind: o.kind as OpportunityKindValue,
		status: displayStatus(o, now),
		pendingApplications: _count.applications
	}));
}

/** Tâche quotidienne : les annonces échues passent à « expirée ». */
export async function expireOpportunities(now = new Date()) {
	const { count } = await prisma.opportunity.updateMany({
		where: { status: 'OPEN', expiresAt: { lte: now } },
		data: { status: 'EXPIRED' }
	});
	return { expired: count };
}
