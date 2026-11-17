/**
 * Annonces (P2-02) : publier, clôturer, lire, lister autour de soi, expirer.
 * Règles pures dans `#lib/opportunities/rules`. Aucune XP à la publication.
 *
 * La zone d'une annonce est la commune de son auteur (`actor_locations`) ;
 * une annonce est visible des personnes situées dans son rayon de diffusion.
 *
 * Recrutement (P3-03) : un groupe émet son annonce « cherche un membre »,
 * publiée par une personne qui le gère (`postedById`). Sa ville est celle du
 * groupe ; toute la gestion du groupe la clôture et tranche les candidatures.
 *
 * Par métier (P4-05) : une annonce de session peut viser un·e ingé son ou
 * un·e producteur·rice (et une spécialité), et se relier à un morceau. Seules
 * les personnes du métier visé la voient autour d'elles et peuvent y répondre.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import {
	normalizeQualification,
	payLabel,
	qualificationSummary
} from '#lib/opportunities/qualification';
import { qualifiedTable } from '#lib/server/db-schema';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { checkStockQuota } from '#lib/server/trust/quotas';
import { getActorLocation } from '#lib/server/geo/queries';
import { MUSICIAN_TIERS } from '#lib/server/progression/core/tiers';
import { distanceBand } from '#lib/geo/distance';
import { clearExpiredAvailabilities } from '#lib/server/jam/availability';
import {
	checkTarget,
	displayStatus,
	expiresAtFor,
	isActive,
	targetLabel,
	type OpportunityInput,
	type OpportunityKindValue,
	type OpportunityTarget
} from '#lib/opportunities/rules';
import { manageableWorks } from '#lib/server/works/service';
import { GIG_TIER_LABELS } from '#lib/opportunities/gigSlot';
import type { MilestoneKey } from '#lib/milestones/rules';

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

/**
 * La personne gère-t-elle cette annonce ? Son auteur, ou une personne qui
 * gère le groupe émetteur (P3-03).
 */
export async function managesIssuer(viewerId: string, issuerActorId: string) {
	if (viewerId === issuerActorId) return true;
	const managed = await prisma.membership.count({
		where: {
			orgId: issuerActorId,
			personId: viewerId,
			status: 'ACTIVE',
			role: { in: ['OWNER', 'ADMIN'] },
			org: { dissolvedAt: null }
		}
	});
	return managed > 0;
}

/** Annonces actives d'une personne (pour le quota). */
async function activeCount(actorId: string, now: Date) {
	return prisma.opportunity.count({
		where: { issuerActorId: actorId, status: 'OPEN', expiresAt: { gt: now } }
	});
}

export async function createOpportunity(
	actorId: string,
	form: Omit<OpportunityInput, 'target'> & { target?: OpportunityTarget },
	now = new Date(),
	/** Publier au nom d'un groupe que l'on gère (recrutement seulement, P3-03). */
	bandId: string | null = null
) {
	const issuerId = bandId ?? actorId;
	// Un plateau a son propre chemin (P5-05a, `gigSlots.ts`) : lieu, date, rang de groupe.
	if (form.kind === 'GIG_SLOT')
		throw new OpportunityError('Un plateau se publie depuis « Publier un plateau ».');
	if (bandId) {
		if (form.kind !== 'RECRUIT_MEMBER') {
			throw new OpportunityError('Au nom d’un groupe, on publie seulement un recrutement.');
		}
		if (!(await managesIssuer(actorId, bandId))) {
			throw new OpportunityError(
				'Seules les personnes qui gèrent le groupe publient en son nom.',
				403
			);
		}
		if (!(await getActorLocation(bandId))) {
			throw new OpportunityError(
				'Indique d’abord la ville du groupe (fiche du groupe) : l’annonce se diffuse autour d’elle.'
			);
		}
	} else if (!(await getActorLocation(actorId))) {
		throw new OpportunityError('Indique d’abord ta ville : une annonce se diffuse autour de toi.');
	}
	// Quota : selon la confiance de la personne qui publie (un groupe reste au
	// palier 0), compté sur les annonces de l'émetteur.
	const quota = await checkStockQuota(
		actorId,
		'activeOpportunities',
		await activeCount(issuerId, now)
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
	// Métier visé (P4-05) : pour un métier du son, ni instrument, ni niveau,
	// ni palier musicien.
	const target = checkTarget(form);
	if (!target.ok) throw new OpportunityError(target.message);
	const pro = target.target.track !== null;
	// Morceau concerné (P4-05) : seulement un morceau que je peux gérer.
	if (form.work && !(await manageableWorks(actorId)).some((w) => w.id === form.work)) {
		throw new OpportunityError('Tu ne gères pas ce morceau.', 403);
	}
	const startsAt = form.startsAt ? new Date(`${form.startsAt}T12:00:00Z`) : undefined;
	if (startsAt && startsAt.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
		throw new OpportunityError('La date est déjà passée.');
	}
	// Conditions (ONB-13b, D63) : seules celles du type d'annonce sont gardées.
	const qualification = normalizeQualification(pro ? 'craft' : 'musicians', form);
	if (!qualification.ok) throw new OpportunityError(qualification.message);
	// Aucune XP ici : la quête rapporte quand elle est remplie (02 §8).
	return prisma.opportunity.create({
		data: {
			issuerActorId: issuerId,
			postedById: bandId ? actorId : null,
			kind: form.kind,
			title: form.title,
			description: form.description,
			instrumentId: pro ? null : (instrument?.id ?? null),
			minLevel: pro ? null : (form.minLevel ?? null),
			genreSlug: genre?.slug ?? null,
			minTier: pro ? null : (form.minTier ?? null),
			targetTrack: target.target.track,
			targetSpecialty: target.target.specialty,
			workId: form.work ?? null,
			radiusKm: form.radiusKm,
			slots: form.slots,
			startsAt: startsAt ?? null,
			expiresAt: expiresAtFor(form.durationDays, now, startsAt),
			...qualification.value
		},
		select: { id: true }
	});
}

export async function closeOpportunity(actorId: string, id: string) {
	const row = await prisma.opportunity.findUnique({
		where: { id },
		select: { issuerActorId: true }
	});
	if (!row || !(await managesIssuer(actorId, row.issuerActorId))) {
		throw new OpportunityError('Cette annonce n’est plus ouverte.');
	}
	const { count } = await prisma.opportunity.updateMany({
		where: { id, status: 'OPEN' },
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
			work: { select: { id: true, title: true, state: true } },
			// Plateau (P5-05a) : le lieu de l'annuaire.
			venue: { select: { id: true, name: true, communeName: true } },
			issuer: {
				select: {
					id: true,
					kind: true,
					handle: true,
					displayName: true,
					location: { select: { communeName: true } }
				}
			}
		}
	});
	if (!o) return null;
	// L'auteur, ou la gestion du groupe émetteur (P3-03).
	const isOwner = await managesIssuer(viewerId, o.issuerActorId);
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
		/** Ce que cherche l'annonce (P4-05), `null` : des musicien·nes. */
		target: o.targetTrack
			? targetLabel(o.targetTrack as OpportunityTarget, o.targetSpecialty)
			: null,
		/** Morceau concerné (P4-05) ; lien seulement s'il est composé (public). */
		work: o.work
			? { id: o.work.id, title: o.work.title, linkable: o.work.state === 'COMPOSED' }
			: null,
		radiusKm: o.radiusKm,
		slots: o.slots,
		startsAt: o.startsAt,
		/** Plateau (P5-05a) : lieu et rang de groupe demandé (jamais l'XP). */
		venue: o.kind === 'GIG_SLOT' ? o.venue : null,
		minBandTier: o.minBandTier ? (GIG_TIER_LABELS[o.minBandTier as MilestoneKey] ?? null) : null,
		/** Conditions précisées (ONB-13b, D63), en mots ; vide : rien de précisé. */
		conditions: qualificationSummary(o),
		expiresAt: o.expiresAt,
		createdAt: o.createdAt,
		commune: o.issuer.location?.communeName ?? null,
		issuer: {
			handle: o.issuer.handle,
			displayName: o.issuer.displayName,
			isBand: o.issuer.kind === 'ORGANIZATION'
		},
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
			-- Métier visé (P4-05) : seules les personnes du métier, et de la
			-- spécialité si elle est précisée, voient l'annonce.
			AND (o."targetTrack" IS NULL OR (
				EXISTS (
					SELECT 1 FROM ${t('person_tracks')} pt
					WHERE pt."personId" = ${viewerId} AND pt.track = o."targetTrack")
				AND (o."targetSpecialty" IS NULL
					OR EXISTS (
						SELECT 1 FROM ${t('sound_engineer_profiles')} sp
						WHERE sp."personId" = ${viewerId} AND o."targetSpecialty" = ANY(sp.specialties::text[]))
					OR EXISTS (
						SELECT 1 FROM ${t('producer_profiles')} pp
						WHERE pp."personId" = ${viewerId} AND o."targetSpecialty" = ANY(pp.specialties::text[])))))
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
		target: o.targetTrack
			? targetLabel(o.targetTrack as OpportunityTarget, o.targetSpecialty)
			: null,
		slots: o.slots,
		startsAt: o.startsAt,
		/** ONB-13b : rémunération en mots, `null` si non précisée. */
		pay: payLabel(o),
		issuer: o.issuer.displayName,
		commune: o.issuer.location?.communeName ?? null,
		distance: distanceBand(meters.get(o.id) ?? 0)
	}));
}

/** Mes annonces et celles des groupes que je gère (P3-03), les plus récentes d'abord. */
export async function listMine(actorId: string, now = new Date()) {
	const bands = await prisma.membership.findMany({
		where: {
			personId: actorId,
			status: 'ACTIVE',
			role: { in: ['OWNER', 'ADMIN'] },
			org: { dissolvedAt: null }
		},
		select: { orgId: true }
	});
	const items = await prisma.opportunity.findMany({
		where: { issuerActorId: { in: [actorId, ...bands.map((b) => b.orgId)] } },
		orderBy: { createdAt: 'desc' },
		take: 50,
		select: {
			id: true,
			kind: true,
			title: true,
			status: true,
			expiresAt: true,
			createdAt: true,
			issuerActorId: true,
			issuer: { select: { displayName: true } },
			// Candidatures à trancher (P2-03).
			_count: {
				select: { applications: { where: { status: { in: ['SENT', 'SEEN', 'SHORTLISTED'] } } } }
			}
		}
	});
	return items.map(({ _count, issuer, issuerActorId, ...o }) => ({
		...o,
		/** Nom du groupe émetteur, si ce n'est pas moi (P3-03). */
		band: issuerActorId === actorId ? null : issuer.displayName,
		kind: o.kind as OpportunityKindValue,
		status: displayStatus(o, now),
		pendingApplications: _count.applications
	}));
}

/**
 * Tâche quotidienne : les annonces échues passent à « expirée », et les
 * disponibilités « Je suis dispo » échues sont effacées (P2-13).
 */
export async function expireOpportunities(now = new Date()) {
	const { count } = await prisma.opportunity.updateMany({
		where: { status: 'OPEN', expiresAt: { lte: now } },
		data: { status: 'EXPIRED' }
	});
	return { expired: count, availabilitiesCleared: await clearExpiredAvailabilities(now) };
}
