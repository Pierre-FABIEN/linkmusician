/**
 * Organisations d'organisateur·rices (P5-05b), seul point d'écriture de
 * `PromoterOrgProfile` et des adhésions de leur gestion. Règles pures dans
 * `#lib/organizations/promoter`. Modèle : le studio (P4-03a/b).
 *
 * - Ouvrir une organisation demande le métier Organisateur·rice et d'être
 *   majeur·e (`isPromoter`, D5) ; la personne en devient responsable
 *   (OWNER). On invite à la co-gestion (ADMIN) une personne qui remplit les
 *   mêmes conditions (Q33).
 * - La page publique `/@handle` existe dès la création, comme un groupe :
 *   nom, présentation, ville, ce qu'elle organise, plateaux ouverts.
 * - Vérification : `organizations/verification.ts` (P5-02), commune à
 *   toutes les organisations.
 * - Aucune XP : l'organisation n'en gagne jamais ; aucune adresse, le
 *   centre de la commune seulement.
 */
import { prisma } from '#lib/server';
import { suggestHandle } from '#lib/actors/handle';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { clearActorLocation, getActorLocation, setActorLocation } from '#lib/server/geo/queries';
import { isPromoter } from '#lib/server/opportunities/gigSlots';
import { isManager } from '#lib/bands/rules';
import {
	answerInvite,
	CoManagementError,
	inviteManager,
	invitesFor,
	leaveOrRemoveManager,
	liveOrgOf,
	lockOrg,
	managedCount,
	ORG_TX,
	requireOrgManager,
	type CoManaged
} from './comanagement';
import type { Commune } from '#lib/geo/fuzz';
import type { PromoterEventKindValue } from '#lib/crafts/promoter';
import {
	gigSlotGaps,
	MAX_MANAGED_PROMOTER_ORGS,
	type PromoterOrgForm,
	type PromoterOrgProfileForm
} from '#lib/organizations/promoter';

/** Erreur montrée à la personne (celle de la co-gestion commune). */
export const PromoterOrgError = CoManagementError;
export type PromoterOrgError = CoManagementError;

const NOT_PROMOTER =
	'Une organisation se gère avec le métier « Organisateur·rice », et majeur·e : ajoute-le dans Réglages, Mes métiers.';

const liveOrg = liveOrgOf('PROMOTER');

/** Co-gestion d'une organisation d'organisateur·rices (Q33). */
const PROMOTER_ORG: CoManaged = {
	kind: 'PROMOTER',
	noun: 'cette organisation',
	maxManaged: MAX_MANAGED_PROMOTER_ORGS,
	canBeInvited: isPromoter,
	notEligible: 'Aucun·e organisateur·rice majeur·e n’a ce nom d’utilisateur.',
	notification: 'ORG_INVITE',
	inviteHref: '/organisations'
};

/** Ouvrir une organisation : la personne en est responsable. */
export async function createPromoterOrg(personId: string, form: PromoterOrgForm) {
	if (!(await isPromoter(personId))) throw new PromoterOrgError(NOT_PROMOTER, 403);
	if ((await managedCount(PROMOTER_ORG, prisma, personId)) >= MAX_MANAGED_PROMOTER_ORGS) {
		throw new PromoterOrgError(`Tu gères déjà ${MAX_MANAGED_PROMOTER_ORGS} organisations.`);
	}
	const handle = await suggestHandle(form.name, async (candidate) =>
		Boolean(await prisma.actor.findUnique({ where: { handle: candidate }, select: { id: true } }))
	);
	return prisma.$transaction(async (tx) => {
		const actor = await tx.actor.create({
			data: {
				kind: 'ORGANIZATION',
				handle,
				displayName: form.name,
				organization: { create: { kind: 'PROMOTER', promoter: { create: {} } } }
			},
			select: { id: true, handle: true }
		});
		await tx.membership.create({
			data: { orgId: actor.id, personId, role: 'OWNER', status: 'ACTIVE', startedAt: new Date() }
		});
		return actor;
	}, ORG_TX);
}

/** Enregistre la fiche : nom, présentation, ce qu'elle organise, genres, jauge, ville. */
export async function updatePromoterOrg(
	orgId: string,
	managerId: string,
	input: Omit<PromoterOrgProfileForm, 'communeCode'> & { commune: Commune | null }
) {
	const known = await prisma.genre.count({ where: { id: { in: input.genreIds }, active: true } });
	if (known !== input.genreIds.length) {
		throw new PromoterOrgError('Un genre choisi n’existe plus : recharge la page.');
	}
	await prisma.$transaction(async (tx) => {
		await lockOrg(tx, orgId);
		await requireOrgManager(PROMOTER_ORG, tx, orgId, managerId);
		await tx.actor.update({
			where: { id: orgId },
			data: { displayName: input.name, bio: input.bio }
		});
		await tx.promoterOrgProfile.update({
			where: { orgId },
			data: { eventKinds: input.eventKinds, capacity: input.capacity }
		});
		await tx.actorGenre.deleteMany({ where: { actorId: orgId } });
		await tx.actorGenre.createMany({
			data: input.genreIds.map((genreId) => ({ actorId: orgId, genreId }))
		});
	}, ORG_TX);
	if (input.commune) await setActorLocation(orgId, input.commune);
	else await clearActorLocation(orgId);
}

// ─── Co-gestion (commune, `comanagement.ts`) ─────────────────────────────

export const invitePromoterManager = (orgId: string, managerId: string, handle: string) =>
	inviteManager(PROMOTER_ORG, orgId, managerId, handle);

export const answerPromoterInvite = (membershipId: string, personId: string, accept: boolean) =>
	answerInvite(PROMOTER_ORG, membershipId, personId, accept);

export const leaveOrRemovePromoterManager = (orgId: string, byId: string, membershipId: string) =>
	leaveOrRemoveManager(PROMOTER_ORG, orgId, byId, membershipId);

// ─── Lectures ────────────────────────────────────────────────────────────

/** `/organisations` : les organisations que je gère. */
export async function myPromoterOrgs(personId: string) {
	const rows = await prisma.membership.findMany({
		where: { personId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, org: liveOrg },
		orderBy: { startedAt: 'asc' },
		select: {
			role: true,
			org: {
				select: {
					actorId: true,
					verifiedAt: true,
					actor: { select: { handle: true, displayName: true } },
					promoter: { select: { eventKinds: true } }
				}
			}
		}
	});
	const locations = await prisma.actorLocation.findMany({
		where: { actorId: { in: rows.map((r) => r.org.actorId) } },
		select: { actorId: true, communeName: true }
	});
	const commune = new Map(locations.map((l) => [l.actorId, l.communeName]));
	return rows.map((r) => {
		const city = commune.get(r.org.actorId) ?? null;
		return {
			id: r.org.actorId,
			handle: r.org.actor.handle,
			name: r.org.actor.displayName,
			role: r.role,
			verified: r.org.verifiedAt !== null,
			commune: city,
			/** Ce qui manque pour publier un plateau en son nom. */
			gaps: gigSlotGaps({
				hasCommune: city !== null,
				eventKinds: r.org.promoter?.eventKinds ?? []
			})
		};
	});
}

export const myPromoterOrgInvites = (personId: string) => invitesFor('PROMOTER', personId);

/** `/organisations/[handle]` : la fiche à remplir, pour sa gestion seulement (`null` sinon). */
export async function promoterOrgForManager(handle: string, personId: string) {
	const actor = await prisma.actor.findFirst({
		where: { handle, kind: 'ORGANIZATION', deletedAt: null, organization: liveOrg },
		select: {
			id: true,
			handle: true,
			displayName: true,
			bio: true,
			genres: { select: { genreId: true } },
			organization: {
				select: {
					promoter: { select: { eventKinds: true, capacity: true } },
					memberships: {
						where: { status: { in: ['ACTIVE', 'INVITED'] } },
						orderBy: { createdAt: 'asc' },
						select: {
							id: true,
							role: true,
							status: true,
							person: { select: { id: true, handle: true, displayName: true } }
						}
					}
				}
			}
		}
	});
	const team = actor?.organization?.memberships ?? [];
	const role = team.find((m) => m.person.id === personId && m.status === 'ACTIVE')?.role;
	const profile = actor?.organization?.promoter;
	if (!actor || !profile || !isManager(role)) return null;
	const [location, gigSlots] = await Promise.all([
		getActorLocation(actor.id),
		prisma.opportunity.findMany({
			where: { issuerActorId: actor.id, kind: 'GIG_SLOT' },
			orderBy: { startsAt: 'desc' },
			take: 10,
			select: {
				id: true,
				title: true,
				startsAt: true,
				status: true,
				expiresAt: true,
				_count: {
					select: { applications: { where: { status: { in: ['SENT', 'SEEN', 'SHORTLISTED'] } } } }
				}
			}
		})
	]);
	return {
		id: actor.id,
		handle: actor.handle,
		name: actor.displayName,
		bio: actor.bio,
		role: role!,
		eventKinds: profile.eventKinds as PromoterEventKindValue[],
		capacity: profile.capacity,
		genreIds: actor.genres.map((g) => g.genreId),
		commune: location
			? {
					code: location.communeCode,
					nom: location.communeName,
					codeDepartement: location.departmentCode
				}
			: null,
		gaps: gigSlotGaps({ hasCommune: location !== null, eventKinds: profile.eventKinds }),
		team: team.map((m) => ({
			membershipId: m.id,
			handle: m.person.handle,
			displayName: m.person.displayName,
			role: m.role,
			status: m.status,
			isMe: m.person.id === personId
		})),
		gigSlots: gigSlots.map(({ _count, ...g }) => ({
			...g,
			pendingApplications: _count.applications
		}))
	};
}

/**
 * Page publique `/@handle` d'une organisation : même visibilité qu'un profil
 * (`publicActorWhere`, blocage dans les deux sens avec sa gestion). Ni XP,
 * ni identifiant interne, ni adresse, ni SIRET.
 */
export async function getPublicPromoterOrg(
	handle: string,
	now = new Date(),
	viewerId?: string | null
) {
	const actor = await prisma.actor.findFirst({
		where: {
			handle,
			kind: 'ORGANIZATION',
			organization: { kind: 'PROMOTER', dissolvedAt: null },
			...publicActorWhere(now, viewerId)
		},
		select: {
			id: true,
			handle: true,
			displayName: true,
			bio: true,
			genres: { select: { genre: { select: { name: true, sortOrder: true } } } },
			organization: {
				select: {
					verifiedAt: true,
					promoter: { select: { eventKinds: true, capacity: true } },
					memberships: {
						where: { status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } },
						orderBy: { startedAt: 'asc' },
						select: { person: { select: { id: true, handle: true, displayName: true } } }
					}
				}
			}
		}
	});
	const org = actor?.organization;
	if (!actor || !org?.promoter) return null;
	if (viewerId) {
		for (const m of org.memberships) {
			if (m.person.id !== viewerId && (await isBlockedBetween(viewerId, m.person.id))) return null;
		}
	}
	const [visible, location, gigSlots] = await Promise.all([
		prisma.actor.findMany({
			where: { id: { in: org.memberships.map((m) => m.person.id) }, ...publicActorWhere(now) },
			select: { id: true }
		}),
		getActorLocation(actor.id),
		prisma.opportunity.findMany({
			where: {
				issuerActorId: actor.id,
				kind: 'GIG_SLOT',
				status: 'OPEN',
				expiresAt: { gt: now }
			},
			orderBy: { startsAt: 'asc' },
			take: 5,
			select: { id: true, title: true, startsAt: true, venue: { select: { name: true } } }
		})
	]);
	const shown = new Set(visible.map((a) => a.id));
	return {
		id: actor.id,
		handle: actor.handle,
		name: actor.displayName,
		bio: actor.bio,
		verified: org.verifiedAt !== null,
		commune: location?.communeName ?? null,
		eventKinds: org.promoter.eventKinds as PromoterEventKindValue[],
		capacity: org.promoter.capacity,
		genres: actor.genres
			.map((g) => g.genre)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((g) => g.name),
		gigSlots: gigSlots.map(({ venue, ...g }) => ({ ...g, venue: venue?.name ?? null })),
		managers: org.memberships
			.filter((m) => shown.has(m.person.id))
			.map((m) => ({ handle: m.person.handle, displayName: m.person.displayName })),
		isManager: Boolean(viewerId && org.memberships.some((m) => m.person.id === viewerId))
	};
}

export type PublicPromoterOrg = NonNullable<Awaited<ReturnType<typeof getPublicPromoterOrg>>>;

/** Organisations que la personne gère, pour son profil public (carte Organisateur·rice). */
export async function promoterOrgsOfPerson(
	personId: string,
	now = new Date(),
	viewerId?: string | null
) {
	const rows = await prisma.membership.findMany({
		where: {
			personId,
			status: 'ACTIVE',
			role: { in: ['OWNER', 'ADMIN'] },
			org: { kind: 'PROMOTER', dissolvedAt: null, actor: publicActorWhere(now, viewerId) }
		},
		orderBy: { startedAt: 'asc' },
		select: { org: { select: { actor: { select: { handle: true, displayName: true } } } } }
	});
	return rows.map((r) => ({ handle: r.org.actor.handle, name: r.org.actor.displayName }));
}
