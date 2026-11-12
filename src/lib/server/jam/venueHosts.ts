/**
 * Animateur·rices affilié·es à un lieu (P5-04b, conception 08 §14). Règles
 * pures : `#lib/jam/venueHosts`.
 *
 * - La gestion du lieu invite une personne « prête à organiser des jams »
 *   (D51, donc majeure) ; elle accepte ou décline depuis « Mes jams ». Seule
 *   cette invitation notifie (pas de notification de masse).
 * - Être animateur·rice ne donne pas la gestion du lieu : on peut être lead
 *   par défaut d'une de ses scènes ouvertes (`JamSeries.leadId`).
 * - Décliner, partir ou être retiré·e supprime la ligne ; on n'est plus lead
 *   par défaut, ni lead des jams à venir de ses séries.
 * - Suggestions (`suggestJamLeads`) : visibles de la seule gestion du lieu,
 *   à moins de 30 km, triées sur des faits (appréciations, jams animées),
 *   jamais l'XP ; ni mineur·e, ni profil masqué ou suspendu, ni personne
 *   bloquée.
 * - Aucune XP : une jam ne rapporte rien aux présent·es ni au lead (D27) ;
 *   seule la jam tenue rapporte à qui a publié la série (`jam.held`).
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { qualifiedTable } from '#lib/server/db-schema';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { notify } from '#lib/server/notifications/service';
import { liveOrgOf, lockOrg, ORG_TX } from '#lib/server/organizations/comanagement';
import { adultBirthCutoff } from '#lib/actors/visibility';
import { distanceBand } from '#lib/geo/distance';
import {
	compareLeadCandidates,
	LEAD_SUGGESTION_RADIUS_KM,
	leadSuggestionFacts,
	MAX_LEAD_SUGGESTIONS,
	MAX_PENDING_HOST_INVITES,
	MAX_VENUE_HOSTS
} from '#lib/jam/venueHosts';
import { isJamOrganizer, JamError } from './publicJams';

const MANAGER = {
	status: 'ACTIVE',
	role: { in: ['OWNER', 'ADMIN'] }
} satisfies Prisma.MembershipWhereInput;

/** L'organisation du lieu, si la personne la gère (OWNER, ADMIN). */
async function managedVenueOrg(venueId: string, managerId: string) {
	const venue = await prisma.venue.findFirst({
		where: {
			id: venueId,
			removedAt: null,
			claimedBy: {
				deletedAt: null,
				organization: {
					...liveOrgOf('VENUE'),
					memberships: { some: { personId: managerId, ...MANAGER } }
				}
			}
		},
		select: { name: true, claimedByActorId: true }
	});
	if (!venue?.claimedByActorId) {
		throw new JamError(
			'Seules les personnes qui gèrent le lieu invitent ses animateur·rices.',
			403
		);
	}
	return { orgId: venue.claimedByActorId, name: venue.name };
}

const isOrgManager = async (orgId: string, personId: string) =>
	(await prisma.membership.count({ where: { orgId, personId, ...MANAGER } })) > 0;

/** Inviter une personne à animer les scènes ouvertes du lieu. Renvoie son nom. */
export async function inviteVenueHost(
	venueId: string,
	managerId: string,
	handle: string,
	now = new Date()
) {
	const { orgId, name } = await managedVenueOrg(venueId, managerId);
	const invitee = await prisma.actor.findFirst({
		where: {
			handle: handle.trim().replace(/^@/, '').toLowerCase(),
			kind: 'PERSON',
			deletedAt: null
		},
		select: { id: true, displayName: true }
	});
	if (!invitee || !(await isJamOrganizer(invitee.id, now))) {
		throw new JamError('Aucune personne prête à organiser des jams n’a ce nom d’utilisateur.', 404);
	}
	if (await isOrgManager(orgId, invitee.id)) {
		throw new JamError(
			`${invitee.displayName} gère déjà ce lieu : elle ou il anime déjà ses jams.`
		);
	}
	if (await isBlockedBetween(managerId, invitee.id)) {
		throw new JamError('Impossible d’inviter cette personne.', 403);
	}
	await prisma.$transaction(async (tx) => {
		await lockOrg(tx, orgId);
		const existing = await tx.venueHost.findUnique({
			where: { orgId_personId: { orgId, personId: invitee.id } },
			select: { status: true }
		});
		if (existing) {
			throw new JamError(
				existing.status === 'ACTIVE'
					? `${invitee.displayName} anime déjà ici.`
					: `${invitee.displayName} est déjà invité·e.`
			);
		}
		const [pending, active] = await Promise.all([
			tx.venueHost.count({ where: { orgId, status: 'INVITED' } }),
			tx.venueHost.count({ where: { orgId, status: 'ACTIVE' } })
		]);
		if (pending >= MAX_PENDING_HOST_INVITES) {
			throw new JamError(`${MAX_PENDING_HOST_INVITES} invitations en attente au plus.`);
		}
		if (active >= MAX_VENUE_HOSTS) {
			throw new JamError(`${MAX_VENUE_HOSTS} animateur·rices au plus par lieu.`);
		}
		await tx.venueHost.create({
			data: { orgId, personId: invitee.id, invitedById: managerId }
		});
		await notify(tx, {
			recipientId: invitee.id,
			type: 'VENUE_HOST_INVITE',
			fromActorId: managerId,
			href: '/jam/mes-jams',
			title: name
		});
	}, ORG_TX);
	return invitee.displayName;
}

/** Accepter ou décliner une invitation à animer. */
export async function answerVenueHostInvite(
	hostId: string,
	personId: string,
	accept: boolean,
	now = new Date()
) {
	const invite = await prisma.venueHost.findFirst({
		where: { id: hostId, personId, status: 'INVITED', org: liveOrgOf('VENUE') },
		select: { id: true }
	});
	if (!invite) throw new JamError('Cette invitation n’est plus valable.', 404);
	if (!accept) {
		await prisma.venueHost.delete({ where: { id: hostId } });
		return;
	}
	if (!(await isJamOrganizer(personId, now))) {
		throw new JamError(
			'Coche d’abord « Je suis prêt·e à organiser des jams » dans ton profil.',
			403
		);
	}
	await prisma.venueHost.update({
		where: { id: hostId },
		data: { status: 'ACTIVE', since: now }
	});
}

/**
 * Retirer un·e animateur·rice (la gestion du lieu), annuler une invitation,
 * ou arrêter d'animer (la personne). Elle n'est plus lead par défaut des
 * séries du lieu, ni lead de leurs jams à venir.
 */
export async function removeVenueHost(hostId: string, byId: string, now = new Date()) {
	const host = await prisma.venueHost.findUnique({
		where: { id: hostId },
		select: { orgId: true, personId: true }
	});
	if (!host) throw new JamError('Cette personne n’anime plus ici.', 404);
	if (host.personId !== byId && !(await isOrgManager(host.orgId, byId))) {
		throw new JamError(
			'Seules les personnes qui gèrent le lieu retirent un·e animateur·rice.',
			403
		);
	}
	await prisma.$transaction([
		prisma.venueHost.delete({ where: { id: hostId } }),
		prisma.opportunity.updateMany({
			where: {
				leadActorId: host.personId,
				status: 'OPEN',
				startsAt: { gt: now },
				series: { issuerActorId: host.orgId }
			},
			data: { leadActorId: null }
		}),
		prisma.jamSeries.updateMany({
			where: { issuerActorId: host.orgId, leadId: host.personId },
			data: { leadId: null }
		})
	]);
}

/** Animateur·rices et invitations du lieu, pour sa gestion. */
export async function venueHostsOf(venueId: string, managerId: string) {
	const { orgId } = await managedVenueOrg(venueId, managerId);
	const rows = await prisma.venueHost.findMany({
		where: { orgId, person: { deletedAt: null } },
		orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
		select: {
			id: true,
			status: true,
			person: { select: { id: true, handle: true, displayName: true } }
		}
	});
	return rows.map((r) => ({
		hostId: r.id,
		personId: r.person.id,
		handle: r.person.handle,
		displayName: r.person.displayName,
		active: r.status === 'ACTIVE'
	}));
}
export type VenueHostRow = Awaited<ReturnType<typeof venueHostsOf>>[number];

/** Invitations à animer reçues, pour « Mes jams ». */
export async function myVenueHostInvites(personId: string) {
	const rows = await prisma.venueHost.findMany({
		where: { personId, status: 'INVITED', org: liveOrgOf('VENUE') },
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			org: {
				select: {
					actor: {
						select: {
							venuesClaimed: {
								where: { removedAt: null },
								take: 1,
								select: { id: true, name: true, communeName: true }
							}
						}
					}
				}
			},
			invitedBy: { select: { displayName: true, deletedAt: true } }
		}
	});
	return rows.flatMap((r) => {
		const venue = r.org.actor.venuesClaimed[0];
		if (!venue) return [];
		return [
			{
				hostId: r.id,
				venueId: venue.id,
				venue: venue.name,
				commune: venue.communeName,
				invitedBy: r.invitedBy && !r.invitedBy.deletedAt ? r.invitedBy.displayName : null
			}
		];
	});
}

/** Lieux où la personne anime, pour « Mes jams » (avec « Arrêter d'animer »). */
export async function myVenueHostings(personId: string) {
	const rows = await prisma.venueHost.findMany({
		where: { personId, status: 'ACTIVE', org: liveOrgOf('VENUE') },
		orderBy: { since: 'asc' },
		select: {
			id: true,
			org: {
				select: {
					actor: {
						select: {
							venuesClaimed: {
								where: { removedAt: null },
								take: 1,
								select: { id: true, name: true }
							},
							jamSeriesIssued: {
								where: { stoppedAt: null, leadId: personId },
								select: { title: true }
							}
						}
					}
				}
			}
		}
	});
	return rows.flatMap((r) => {
		const venue = r.org.actor.venuesClaimed[0];
		if (!venue) return [];
		return [
			{
				hostId: r.id,
				venueId: venue.id,
				venue: venue.name,
				leads: r.org.actor.jamSeriesIssued.map((s) => s.title)
			}
		];
	});
}

/**
 * Personnes à suggérer comme lead : « prêtes à organiser des jams » (D51),
 * majeures, à moins de 30 km du lieu, ni masquées, ni suspendues, ni
 * bloquées avec qui regarde ; ni gestion, ni déjà animatrices ou invitées.
 * Triées par appréciations reçues puis jams animées, jamais par l'XP.
 */
export async function suggestJamLeads(venueId: string, viewerId: string, now = new Date()) {
	const { orgId } = await managedVenueOrg(venueId, viewerId);
	const t = (name: string) => qualifiedTable(name);
	const rows = await prisma.$queryRaw<
		{ actorId: string; meters: number; endorsers: number; jamsLed: number }[]
	>`
		SELECT a.id AS "actorId",
			public.ST_Distance(here.point, loc.point)::float8 AS meters,
			(SELECT COUNT(DISTINCT e."fromActorId") FROM (
				SELECT je."fromActorId" FROM ${t('jam_endorsements')} je
				WHERE je."toActorId" = a.id AND je."revokedAt" IS NULL
				UNION ALL
				SELECT ce."fromActorId" FROM ${t('collab_endorsements')} ce
				WHERE ce."toActorId" = a.id AND ce."revokedAt" IS NULL
			) e)::int AS endorsers,
			(SELECT COUNT(*) FROM ${t('opportunities')} o
				WHERE o."leadActorId" = a.id AND o."heldAt" IS NOT NULL)::int AS "jamsLed"
		FROM ${t('persons')} p
		JOIN ${t('actors')} a ON a.id = p."actorId"
		JOIN ${t('actor_locations')} loc ON loc."actorId" = a.id
		JOIN ${t('actor_locations')} here ON here."actorId" = ${orgId}
		WHERE p."organizesJams" = true
			AND p."birthDate" IS NOT NULL AND p."birthDate" <= ${adultBirthCutoff(now)}
			AND a."deletedAt" IS NULL AND a.hidden = false AND a.id <> ${viewerId}
			AND public.ST_DWithin(here.point, loc.point, ${LEAD_SUGGESTION_RADIUS_KM * 1000})
			AND NOT EXISTS (
				SELECT 1 FROM ${t('memberships')} m
				WHERE m."orgId" = ${orgId} AND m."personId" = a.id AND m.status::text = 'ACTIVE')
			AND NOT EXISTS (
				SELECT 1 FROM ${t('venue_hosts')} h
				WHERE h."orgId" = ${orgId} AND h."personId" = a.id)
			AND NOT EXISTS (
				SELECT 1 FROM ${t('blocks')} b
				WHERE (b."blockerActorId" = ${viewerId} AND b."blockedActorId" = a.id)
					OR (b."blockerActorId" = a.id AND b."blockedActorId" = ${viewerId}))
			AND NOT EXISTS (
				SELECT 1 FROM ${t('sanctions')} s
				WHERE s."actorId" = a.id AND s.kind::text = 'SUSPENSION' AND s."liftedAt" IS NULL
				AND (s.until IS NULL OR s.until > ${now}))
		ORDER BY endorsers DESC, "jamsLed" DESC, meters ASC
		LIMIT ${MAX_LEAD_SUGGESTIONS}`;
	if (rows.length === 0) return [];
	const people = await prisma.actor.findMany({
		where: { id: { in: rows.map((r) => r.actorId) } },
		select: {
			id: true,
			handle: true,
			displayName: true,
			location: { select: { communeName: true } },
			person: {
				select: {
					instruments: {
						orderBy: [{ isPrimary: 'desc' }],
						take: 2,
						select: { instrument: { select: { name: true } } }
					}
				}
			}
		}
	});
	const byId = new Map(people.map((p) => [p.id, p]));
	return [...rows].sort(compareLeadCandidates).flatMap((r) => {
		const p = byId.get(r.actorId);
		if (!p) return [];
		return [
			{
				handle: p.handle,
				displayName: p.displayName,
				commune: p.location?.communeName ?? null,
				// Toujours par tranches, jamais en mètres (invariant).
				distance: distanceBand(r.meters),
				instruments: p.person?.instruments.map((i) => i.instrument.name) ?? [],
				facts: leadSuggestionFacts(r)
			}
		];
	});
}
export type JamLeadSuggestion = Awaited<ReturnType<typeof suggestJamLeads>>[number];
