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
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { suggestHandle } from '#lib/actors/handle';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { clearActorLocation, getActorLocation, setActorLocation } from '#lib/server/geo/queries';
import { notify } from '#lib/server/notifications/service';
import { isPromoter } from '#lib/server/opportunities/gigSlots';
import { isManager, successorOf } from '#lib/bands/rules';
import type { Commune } from '#lib/geo/fuzz';
import type { PromoterEventKindValue } from '#lib/crafts/promoter';
import {
	gigSlotGaps,
	MAX_MANAGED_PROMOTER_ORGS,
	MAX_PENDING_ORG_INVITES,
	type PromoterOrgForm,
	type PromoterOrgProfileForm
} from '#lib/organizations/promoter';

export class PromoterOrgError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

type Tx = Prisma.TransactionClient;
const TX = { timeout: 20_000 } as const;

const NOT_PROMOTER =
	'Une organisation se gère avec le métier « Organisateur·rice », et majeur·e : ajoute-le dans Réglages, Mes métiers.';

async function lockOrg(tx: Tx, orgId: string) {
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`promoter:${orgId}`}))`;
}

const liveOrg = { kind: 'PROMOTER', dissolvedAt: null, actor: { deletedAt: null } } as const;

async function requireManager(tx: Tx | typeof prisma, orgId: string, personId: string) {
	const mine = await tx.membership.findFirst({
		where: { orgId, personId, status: 'ACTIVE', org: liveOrg },
		select: { role: true }
	});
	if (!mine) throw new PromoterOrgError('Cette organisation n’existe plus.', 404);
	if (!isManager(mine.role))
		throw new PromoterOrgError('Seules les personnes qui gèrent l’organisation la modifient.', 403);
}

const managedCount = (db: Tx | typeof prisma, personId: string) =>
	db.membership.count({
		where: { personId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, org: liveOrg }
	});

/** Ouvrir une organisation : la personne en est responsable. */
export async function createPromoterOrg(personId: string, form: PromoterOrgForm) {
	if (!(await isPromoter(personId))) throw new PromoterOrgError(NOT_PROMOTER, 403);
	if ((await managedCount(prisma, personId)) >= MAX_MANAGED_PROMOTER_ORGS) {
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
	}, TX);
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
		await requireManager(tx, orgId, managerId);
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
	}, TX);
	if (input.commune) await setActorLocation(orgId, input.commune);
	else await clearActorLocation(orgId);
}

// ─── Co-gestion ──────────────────────────────────────────────────────────

/** Inviter une personne à gérer l'organisation (ADMIN). */
export async function invitePromoterManager(orgId: string, managerId: string, handle: string) {
	const invitee = await prisma.actor.findFirst({
		where: {
			handle: handle.trim().replace(/^@/, '').toLowerCase(),
			kind: 'PERSON',
			deletedAt: null
		},
		select: { id: true, displayName: true }
	});
	if (!invitee || !(await isPromoter(invitee.id))) {
		throw new PromoterOrgError('Aucun·e organisateur·rice majeur·e n’a ce nom d’utilisateur.', 404);
	}
	if (invitee.id === managerId) throw new PromoterOrgError('Tu gères déjà cette organisation.');
	if (await isBlockedBetween(managerId, invitee.id)) {
		throw new PromoterOrgError('Impossible d’inviter cette personne.', 403);
	}
	await prisma.$transaction(async (tx) => {
		await lockOrg(tx, orgId);
		await requireManager(tx, orgId, managerId);
		const open = await tx.membership.findFirst({
			where: { orgId, personId: invitee.id, status: { in: ['INVITED', 'REQUESTED', 'ACTIVE'] } },
			select: { status: true }
		});
		if (open) {
			throw new PromoterOrgError(
				open.status === 'ACTIVE'
					? `${invitee.displayName} gère déjà cette organisation.`
					: `${invitee.displayName} est déjà invité·e.`
			);
		}
		const pending = await tx.membership.count({ where: { orgId, status: 'INVITED' } });
		if (pending >= MAX_PENDING_ORG_INVITES) {
			throw new PromoterOrgError(`${MAX_PENDING_ORG_INVITES} invitations en attente au plus.`);
		}
		await tx.membership.create({
			data: {
				orgId,
				personId: invitee.id,
				role: 'ADMIN',
				status: 'INVITED',
				invitedById: managerId
			}
		});
		const org = await tx.actor.findUniqueOrThrow({
			where: { id: orgId },
			select: { displayName: true }
		});
		await notify(tx, {
			recipientId: invitee.id,
			type: 'ORG_INVITE',
			fromActorId: managerId,
			href: '/organisations',
			title: org.displayName
		});
	}, TX);
	return invitee.displayName;
}

/** Accepter ou décliner une invitation à la co-gestion. */
export async function answerPromoterInvite(
	membershipId: string,
	personId: string,
	accept: boolean
) {
	await prisma.$transaction(async (tx) => {
		const invite = await tx.membership.findFirst({
			where: { id: membershipId, personId, status: 'INVITED', org: liveOrg },
			select: { orgId: true }
		});
		if (!invite) throw new PromoterOrgError('Cette invitation n’est plus valable.', 404);
		await lockOrg(tx, invite.orgId);
		if (accept && (await managedCount(tx, personId)) >= MAX_MANAGED_PROMOTER_ORGS) {
			throw new PromoterOrgError(`Tu gères déjà ${MAX_MANAGED_PROMOTER_ORGS} organisations.`);
		}
		await tx.membership.update({
			where: { id: membershipId },
			data: accept
				? { status: 'ACTIVE', startedAt: new Date() }
				: { status: 'DECLINED', endedAt: new Date() }
		});
	}, TX);
}

/**
 * Retirer une personne de la gestion, annuler une invitation, ou partir.
 * Seul·e la ou le responsable retire quelqu'un ; qui part en étant
 * responsable transmet l'organisation (`successorOf`) ; seul·e, on ne part
 * pas.
 */
export async function leaveOrRemovePromoterManager(
	orgId: string,
	byId: string,
	membershipId: string
) {
	await prisma.$transaction(async (tx) => {
		await lockOrg(tx, orgId);
		const target = await tx.membership.findFirst({
			where: { id: membershipId, orgId, status: { in: ['INVITED', 'ACTIVE'] } },
			select: { id: true, personId: true, role: true, status: true }
		});
		if (!target)
			throw new PromoterOrgError('Cette personne ne fait plus partie de la gestion.', 404);
		const self = target.personId === byId;
		if (!self) {
			const me = await tx.membership.findFirst({
				where: { orgId, personId: byId, status: 'ACTIVE', org: liveOrg },
				select: { role: true }
			});
			const allowed = me?.role === 'OWNER' || (isManager(me?.role) && target.status === 'INVITED');
			if (!allowed)
				throw new PromoterOrgError('Seul·e la ou le responsable retire quelqu’un.', 403);
		}
		const now = new Date();
		if (target.status === 'INVITED') {
			await tx.membership.update({
				where: { id: target.id },
				data: { status: 'DECLINED', endedAt: now }
			});
			return;
		}
		if (target.role === 'OWNER') {
			const active = await tx.membership.findMany({
				where: { orgId, status: 'ACTIVE' },
				select: { id: true, personId: true, role: true, startedAt: true }
			});
			const next = successorOf(target.personId, active);
			if (!next) {
				throw new PromoterOrgError(
					'Tu es seul·e à gérer cette organisation : invite quelqu’un pour te passer le relais.'
				);
			}
			await tx.membership.update({ where: { id: next.id }, data: { role: 'OWNER' } });
		}
		await tx.membership.update({
			where: { id: target.id },
			data: { status: self ? 'LEFT' : 'REMOVED', endedAt: now }
		});
	}, TX);
}

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

export async function myPromoterOrgInvites(personId: string) {
	const rows = await prisma.membership.findMany({
		where: { personId, status: 'INVITED', org: liveOrg },
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			org: { select: { actor: { select: { displayName: true } } } },
			invitedBy: { select: { displayName: true, deletedAt: true } }
		}
	});
	return rows.map((r) => ({
		membershipId: r.id,
		name: r.org.actor.displayName,
		invitedBy: r.invitedBy && !r.invitedBy.deletedAt ? r.invitedBy.displayName : null
	}));
}

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
