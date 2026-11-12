/**
 * Fiche d'un lieu revendiqué (P5-03b, conception 08 §14), seul point
 * d'écriture de `VenueProfile`. Règles pures : `#lib/venues/profile`.
 *
 * - Le lieu est géré par son organisation `VENUE`, née de la revendication
 *   (P5-03a). Sa gestion remplit la fiche et la publie (rang « Lieu
 *   ouvert ») ; une fiche publiée qui ne remplit plus les conditions repasse
 *   en brouillon.
 * - Co-gestion commune (`organizations/comanagement.ts`) : on invite une
 *   personne majeure, sans métier exigé (Q18 : pas de piste `VENUE_HOST`).
 * - L'organisation prend la commune du lieu (`actor_locations`) : ses
 *   plateaux se diffusent autour de lui et la zone des groupes s'y mesure.
 * - Rang lu dans les faits (`venueSummary`, dates `gig.held`), jamais dans
 *   l'XP ; le lieu n'en gagne pas (Q24).
 * - Photos (P5-03d) : portées par l'organisation (`Media.actorId`), envoyées
 *   par une personne de la gestion (`uploadedById`), validées selon sa
 *   confiance (`finalizeUpload`), huit au plus ; aucune XP.
 */
import { structureAccess } from '#lib/server/organizations/access';
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { setActorLocation } from '#lib/server/geo/queries';
import { isAdult } from '#lib/server/jam/publicJams';
import { toDomainEvent } from '#lib/server/progression/events';
import { venueSummary } from '#lib/server/progression/core/venueSummary';
import { VENUE_TIERS, venueTier } from '#lib/server/progression/core/tiers';
import { deleteOwnMedia, MediaError } from '#lib/server/media/service';
import {
	MAX_VENUE_PHOTOS,
	publicationGaps,
	VENUE_LEARNING,
	venueQuests,
	type VenueAgeRuleValue,
	type VenueConditionValue,
	type VenueProfileForm
} from '#lib/venues/profile';
import {
	answerInvite,
	CoManagementError,
	inviteManager,
	invitesFor,
	leaveOrRemoveManager,
	liveOrgOf,
	lockOrg,
	ORG_TX,
	requireOrgManager,
	teamOf,
	type CoManaged
} from '#lib/server/organizations/comanagement';

/** Erreur montrée à la personne (celle de la co-gestion commune). */
export const VenueProfileError = CoManagementError;
export type VenueProfileError = CoManagementError;

/** Lieux gérés par une même personne (comme la revendication, P5-03a). */
export const MAX_MANAGED_VENUES = 3;

const VENUE_ORG: CoManaged = {
	kind: 'VENUE',
	noun: 'ce lieu',
	maxManaged: MAX_MANAGED_VENUES,
	canBeInvited: (personId) => isAdult(personId),
	notEligible: 'Aucune personne majeure n’a ce nom d’utilisateur.',
	notification: 'ORG_INVITE',
	inviteHref: '/organisations'
};

const liveVenueOrg = liveOrgOf('VENUE');

/** L'organisation qui gère ce lieu, s'il est revendiqué et vivant. */
async function venueOrg(venueId: string) {
	const venue = await prisma.venue.findFirst({
		where: { id: venueId, removedAt: null, claimedBy: { organization: liveVenueOrg } },
		select: {
			id: true,
			name: true,
			communeCode: true,
			communeName: true,
			departmentCode: true,
			lat: true,
			lng: true,
			claimedByActorId: true
		}
	});
	return venue?.claimedByActorId ? { ...venue, orgId: venue.claimedByActorId } : null;
}

/** Dates et jams publiques tenues au lieu, et rang (Lieu ouvert, Scène ouverte…). */
async function rankOf(orgId: string, published: boolean) {
	const rows = await prisma.domainEvent.findMany({
		where: { actorIds: { has: orgId }, type: { in: ['gig.held', 'jam.held'] } },
		select: { id: true, type: true, payload: true, occurredAt: true }
	});
	const summary = venueSummary(orgId, published, rows.map(toDomainEvent));
	const { tier } = venueTier(summary);
	const next = VENUE_TIERS.find((t) => !t.reached(summary));
	return {
		summary,
		tier,
		next: next ? { id: next.id, label: next.label } : null
	};
}

const profileSelect = {
	capacity: true,
	stage: true,
	conditions: true,
	days: true,
	ageRule: true,
	publishedAt: true
} as const;

const EMPTY_PROFILE = {
	capacity: null,
	stage: '',
	conditions: [] as VenueConditionValue[],
	days: [] as number[],
	ageRule: 'ALL_AGES' as VenueAgeRuleValue,
	publishedAt: null as Date | null
};

/**
 * Enregistre la fiche (créée au premier enregistrement) et place
 * l'organisation dans la commune du lieu. Une fiche publiée qui ne remplit
 * plus les conditions repasse en brouillon.
 */
export async function updateVenueProfile(
	venueId: string,
	managerId: string,
	input: VenueProfileForm
) {
	const venue = await venueOrg(venueId);
	if (!venue) throw new VenueProfileError('Ce lieu n’est pas géré sur LinkMusician.', 404);
	const known = await prisma.genre.count({ where: { id: { in: input.genreIds }, active: true } });
	if (known !== input.genreIds.length) {
		throw new VenueProfileError('Un genre choisi n’existe plus : recharge la page.');
	}
	const { genreIds, ...fiche } = input;
	const unpublished = await prisma.$transaction(async (tx) => {
		await lockOrg(tx, venue.orgId);
		await requireOrgManager(VENUE_ORG, tx, venue.orgId, managerId);
		const profile = await tx.venueProfile.upsert({
			where: { orgId: venue.orgId },
			create: { orgId: venue.orgId, ...fiche },
			update: fiche,
			select: { publishedAt: true }
		});
		await tx.actorGenre.deleteMany({ where: { actorId: venue.orgId } });
		await tx.actorGenre.createMany({
			data: genreIds.map((genreId) => ({ actorId: venue.orgId, genreId }))
		});
		const gaps = publicationGaps({ ...fiche, genres: genreIds.length });
		if (profile.publishedAt && gaps.length > 0) {
			await tx.venueProfile.update({
				where: { orgId: venue.orgId },
				data: { publishedAt: null }
			});
			return true;
		}
		return false;
	}, ORG_TX);
	// Le point du lieu est déjà le centre de sa commune aligné sur la grille.
	await setActorLocation(venue.orgId, {
		code: venue.communeCode,
		nom: venue.communeName,
		codeDepartement: venue.departmentCode,
		codesPostaux: [],
		centre: { lat: venue.lat, lng: venue.lng }
	});
	return { unpublished };
}

/** Publie la fiche (rang « Lieu ouvert ») si elle est complète, ou la retire. */
export async function setVenuePublished(
	venueId: string,
	managerId: string,
	published: boolean,
	now = new Date()
) {
	const venue = await venueOrg(venueId);
	if (!venue) throw new VenueProfileError('Ce lieu n’est pas géré sur LinkMusician.', 404);
	await prisma.$transaction(async (tx) => {
		await lockOrg(tx, venue.orgId);
		await requireOrgManager(VENUE_ORG, tx, venue.orgId, managerId);
		const profile = await tx.venueProfile.findUnique({
			where: { orgId: venue.orgId },
			select: { ...profileSelect }
		});
		if (!published) {
			if (profile)
				await tx.venueProfile.update({
					where: { orgId: venue.orgId },
					data: { publishedAt: null }
				});
			return;
		}
		if (profile?.publishedAt) return;
		const genres = await tx.actorGenre.count({ where: { actorId: venue.orgId } });
		if (!profile || publicationGaps({ ...profile, genres }).length > 0) {
			throw new VenueProfileError('Complète la fiche avant de la publier.');
		}
		await tx.venueProfile.update({ where: { orgId: venue.orgId }, data: { publishedAt: now } });
	}, ORG_TX);
}

// ─── Co-gestion ──────────────────────────────────────────────────────────

async function orgOrThrow(venueId: string) {
	const venue = await venueOrg(venueId);
	if (!venue) throw new VenueProfileError('Ce lieu n’est pas géré sur LinkMusician.', 404);
	return venue.orgId;
}

export const inviteVenueManager = async (venueId: string, managerId: string, handle: string) =>
	inviteManager(VENUE_ORG, await orgOrThrow(venueId), managerId, handle);

export const answerVenueInvite = (membershipId: string, personId: string, accept: boolean) =>
	answerInvite(VENUE_ORG, membershipId, personId, accept);

export const leaveOrRemoveVenueManager = async (
	venueId: string,
	byId: string,
	membershipId: string
) => leaveOrRemoveManager(VENUE_ORG, await orgOrThrow(venueId), byId, membershipId);

export const myVenueInvites = (personId: string) => invitesFor('VENUE', personId);

// ─── Photos (P5-03d) ─────────────────────────────────────────────────────

/** Photos qui comptent dans la limite : en ligne, en cours ou en attente. */
const LIVE_PHOTO = { kind: 'IMAGE', status: { not: 'REJECTED' } } as const;

/**
 * Avant un envoi de photo au nom du lieu (par le nom d'utilisateur de son
 * organisation) : la personne le gère, et il reste de la place. Renvoie
 * l'identifiant de l'organisation, qui porte la photo ; `null` si ce nom
 * n'est pas celui d'un lieu.
 */
export async function venueForPhotoUpload(handle: string, personId: string) {
	const org = await prisma.actor.findFirst({
		where: { handle, kind: 'ORGANIZATION', deletedAt: null, organization: liveVenueOrg },
		select: { id: true }
	});
	if (!org) return null;
	await requireOrgManager(VENUE_ORG, prisma, org.id, personId);
	const photos = await prisma.media.count({ where: { actorId: org.id, ...LIVE_PHOTO } });
	if (photos >= MAX_VENUE_PHOTOS) {
		throw new VenueProfileError(`${MAX_VENUE_PHOTOS} photos au plus : retires-en une d’abord.`);
	}
	return org.id;
}

/** Retirer une photo de la fiche : la gestion du lieu seulement. */
export async function deleteVenuePhoto(venueId: string, managerId: string, mediaId: string) {
	const orgId = await orgOrThrow(venueId);
	await requireOrgManager(VENUE_ORG, prisma, orgId, managerId);
	try {
		await deleteOwnMedia(orgId, mediaId);
	} catch (err) {
		if (err instanceof MediaError) throw new VenueProfileError(err.message, 404);
		throw err;
	}
}

// ─── Lectures ────────────────────────────────────────────────────────────

/** Les lieux que je gère (`/organisations`, plateaux en leur nom). */
export async function myVenues(personId: string) {
	const rows = await prisma.membership.findMany({
		where: {
			personId,
			status: 'ACTIVE',
			role: { in: ['OWNER', 'ADMIN'] },
			org: liveVenueOrg
		},
		orderBy: { startedAt: 'asc' },
		select: {
			role: true,
			org: {
				select: {
					actorId: true,
					actor: { select: { handle: true, displayName: true } },
					venueProfile: { select: { publishedAt: true } },
					venueClaims: {
						where: { status: 'APPROVED' },
						take: 1,
						select: { venue: { select: { id: true, name: true, communeName: true } } }
					}
				}
			}
		}
	});
	return rows.flatMap((r) => {
		const venue = r.org.venueClaims[0]?.venue;
		if (!venue) return [];
		return [
			{
				orgId: r.org.actorId,
				handle: r.org.actor.handle,
				name: venue.name,
				venueId: venue.id,
				commune: venue.communeName,
				role: r.role,
				published: Boolean(r.org.venueProfile?.publishedAt)
			}
		];
	});
}

/** `/lieux/[id]/gerer` : la fiche à remplir, pour sa gestion seulement (`null` sinon). */
export async function venueForManager(venueId: string, personId: string) {
	const venue = await venueOrg(venueId);
	if (!venue) return null;
	const mine = await structureAccess(prisma, venue.orgId, personId, 'VENUE');
	if (!mine?.permissions.includes('venue.manage')) return null;
	const [profile, genres, team, gigSlots, bandsProgrammed, publicJams, backline, org, photos] =
		await Promise.all([
			prisma.venueProfile.findUnique({ where: { orgId: venue.orgId }, select: profileSelect }),
			prisma.actorGenre.findMany({ where: { actorId: venue.orgId }, select: { genreId: true } }),
			teamOf(venue.orgId, personId),
			prisma.opportunity.findMany({
				where: { venueId, kind: 'GIG_SLOT', issuerActorId: venue.orgId },
				orderBy: { startsAt: 'desc' },
				take: 10,
				select: {
					id: true,
					title: true,
					startsAt: true,
					status: true,
					expiresAt: true,
					_count: {
						select: {
							applications: { where: { status: { in: ['SENT', 'SEEN', 'SHORTLISTED'] } } }
						}
					}
				}
			}),
			prisma.application.count({
				where: {
					status: 'ACCEPTED',
					opportunity: { kind: 'GIG_SLOT', venueId, issuerActorId: venue.orgId }
				}
			}),
			prisma.opportunity.count({ where: { kind: 'JAM', venueId } }),
			prisma.venue.findUniqueOrThrow({ where: { id: venueId }, select: { backline: true } }),
			prisma.actor.findUniqueOrThrow({ where: { id: venue.orgId }, select: { handle: true } }),
			// Photos (P5-03d) : toutes, avec leur état, pour la gestion.
			prisma.media.findMany({
				where: { actorId: venue.orgId, kind: 'IMAGE', status: { not: 'UPLOADING' } },
				orderBy: { createdAt: 'asc' },
				select: { id: true, title: true, status: true, fileUrl: true, rejectionReason: true }
			})
		]);
	const fiche = profile ?? EMPTY_PROFILE;
	const published = fiche.publishedAt !== null;
	const rank = await rankOf(venue.orgId, published);
	return {
		venueId,
		name: venue.name,
		communeName: venue.communeName,
		/** Nom d'utilisateur de l'organisation : l'envoi des photos le désigne. */
		orgHandle: org.handle,
		photos,
		role: mine!.role,
		...fiche,
		conditions: fiche.conditions as VenueConditionValue[],
		ageRule: fiche.ageRule as VenueAgeRuleValue,
		hasBackline: backline.backline.length > 0,
		genreIds: genres.map((g) => g.genreId),
		gaps: publicationGaps({ ...fiche, genres: genres.length }),
		team,
		gigSlots: gigSlots.map(({ _count, ...g }) => ({
			...g,
			pendingApplications: _count.applications
		})),
		quests: venueQuests(
			{
				published,
				gigSlots: gigSlots.length,
				bandsProgrammed,
				publicJams,
				firstDates: rank.summary.firstDates
			},
			venueId
		),
		learning: VENUE_LEARNING,
		rank: { tier: rank.tier, next: rank.next, dates: rank.summary.dates }
	};
}

/**
 * Ce que la page `/lieux/[id]` montre en plus pour un lieu géré : la fiche
 * publiée, le rang, la gestion visible, et l'agenda des plateaux ouverts
 * (d'auteurs visibles par la personne). `null` si la fiche n'est pas
 * publiée ; l'agenda des jams reste lu à part (`upcomingJamsAt`).
 */
export async function publicVenueProfile(venueId: string, viewerId: string, now = new Date()) {
	const venue = await venueOrg(venueId);
	if (!venue) return null;
	const [profile, genres, managers, gigSlots, photos] = await Promise.all([
		prisma.venueProfile.findUnique({ where: { orgId: venue.orgId }, select: profileSelect }),
		prisma.actorGenre.findMany({
			where: { actorId: venue.orgId },
			select: { genre: { select: { name: true, sortOrder: true } } }
		}),
		prisma.membership.findMany({
			where: {
				orgId: venue.orgId,
				status: 'ACTIVE',
				role: { in: ['OWNER', 'ADMIN'] },
				person: publicActorWhere(now, viewerId)
			},
			orderBy: { startedAt: 'asc' },
			select: { person: { select: { id: true, handle: true, displayName: true } } }
		}),
		prisma.opportunity.findMany({
			where: {
				venueId,
				kind: 'GIG_SLOT',
				status: 'OPEN',
				expiresAt: { gt: now },
				issuer: publicActorWhere(now, viewerId)
			},
			orderBy: { startsAt: 'asc' },
			take: 10,
			select: { id: true, title: true, startsAt: true, slots: true }
		}),
		// Photos publiées seulement (P5-03d).
		prisma.media.findMany({
			where: {
				actorId: venue.orgId,
				kind: 'IMAGE',
				status: 'PUBLISHED',
				fileUrl: { not: null }
			},
			orderBy: { createdAt: 'asc' },
			take: MAX_VENUE_PHOTOS,
			select: { id: true, title: true, fileUrl: true }
		})
	]);
	if (!profile?.publishedAt) return null;
	const visibleManagers = [];
	for (const m of managers) {
		if (m.person.id === viewerId || !(await isBlockedBetween(viewerId, m.person.id)))
			visibleManagers.push({ handle: m.person.handle, displayName: m.person.displayName });
	}
	const rank = await rankOf(venue.orgId, true);
	return {
		capacity: profile.capacity,
		stage: profile.stage,
		conditions: profile.conditions as VenueConditionValue[],
		days: profile.days,
		ageRule: profile.ageRule as VenueAgeRuleValue,
		genres: genres
			.map((g) => g.genre)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((g) => g.name),
		tier: rank.tier,
		dates: rank.summary.dates,
		managers: visibleManagers,
		isManager: managers.some((m) => m.person.id === viewerId),
		gigSlots,
		photos: photos.map((p) => ({ id: p.id, title: p.title, url: p.fileUrl! }))
	};
}
