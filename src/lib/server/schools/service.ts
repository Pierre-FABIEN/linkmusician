/**
 * Écoles, MJC, conservatoires (P5-11, D29). Seul point d'écriture des
 * organisations `SCHOOL`, de leur fiche, de leurs liens d'invitation et des
 * adhésions de leurs élèves (hors anonymisation). Règles pures :
 * `#lib/schools/rules`.
 *
 * - **Ouvrir** une école : une personne majeure (D5) en devient
 *   responsable (OWNER). Trois écoles gérées au plus. La co-gestion par
 *   plusieurs profs vient plus tard (Q52). La vérification (P5-02) est
 *   recommandée, pas exigée.
 * - **Inviter** les élèves par un lien : seul le hachage SHA-256 du jeton
 *   est stocké ; 30 jours, un plafond d'usages, révocable. La personne qui
 *   le suit devient membre (`MEMBER`) de l'école. **Aucune liste d'élèves
 *   publique** : seule la gestion la voit.
 * - **Ateliers jam** : des jams publiées au nom de l'école, `audience:
 *   SCHOOL` (réservées à ses membres, `audienceWhere`), lead = la personne
 *   qui publie. Mineur·es : seulement des ateliers finis avant 22 h, comme
 *   toute jam (`endsBeforeCurfew`). Un atelier ne rapporte rien et n'est
 *   jamais « tenu » (D27, Q53).
 */
import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { structureAccess } from '#lib/server/organizations/access';
import { prisma } from '#lib/server';
import { suggestHandle } from '#lib/actors/handle';
import { isIndexable } from '#lib/actors/visibility';
import { checkJamWindow, type JamForm } from '#lib/jam/publicJam';
import { getVenue } from '#lib/server/venues/service';
import { lockOrg, ORG_TX } from '#lib/server/organizations/comanagement';
import {
	DEFAULT_INVITE_USES,
	INVITE_DAYS,
	INVITE_STATE_MESSAGES,
	INVITE_TOKEN,
	inviteState,
	MAX_ACTIVE_INVITES,
	MAX_MANAGED_SCHOOLS,
	type SchoolForm,
	type SchoolKindValue
} from '#lib/schools/rules';

export class SchoolError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

type Tx = Prisma.TransactionClient;
const DAY = 86_400_000;
/** Ateliers à venir publiés à la fois, par école. */
export const MAX_OPEN_WORKSHOPS = 20;

const liveSchool = { kind: 'SCHOOL', dissolvedAt: null, actor: { deletedAt: null } } as const;
const MANAGES = {
	status: 'ACTIVE',
	role: { in: ['OWNER', 'ADMIN'] }
} satisfies Prisma.MembershipWhereInput;

export const hashInviteToken = (token: string) => createHash('sha256').update(token).digest('hex');

async function isAdultPerson(personId: string, now: Date) {
	const p = await prisma.person.findUnique({
		where: { actorId: personId },
		select: { birthDate: true }
	});
	return isIndexable(p?.birthDate, now);
}

/** L'école que la personne gère (OWNER, ADMIN), par son nom d'utilisateur. Sinon une erreur. */
async function managedSchool(db: Tx | typeof prisma, handle: string, managerId: string) {
	const org = await db.organization.findFirst({
		where: {
			...liveSchool,
			actor: { handle, deletedAt: null }
		},
		select: { actorId: true, actor: { select: { displayName: true, handle: true } } }
	});
	if (
		!org ||
		!(await structureAccess(db, org.actorId, managerId, 'SCHOOL'))?.permissions.includes(
			'school.manage'
		)
	)
		throw new SchoolError('Seules les personnes qui gèrent l’école font cela.', 403);
	return { id: org.actorId, name: org.actor.displayName, handle: org.actor.handle };
}

/** Ouvrir une école : la personne en est responsable. */
export async function createSchool(personId: string, form: SchoolForm, now = new Date()) {
	if (!(await isAdultPerson(personId, now))) {
		throw new SchoolError('Il faut être majeur·e pour ouvrir une école sur LinkMusician.', 403);
	}
	const managed = await prisma.membership.count({
		where: { personId, ...MANAGES, org: liveSchool }
	});
	if (managed >= MAX_MANAGED_SCHOOLS) {
		throw new SchoolError(`Tu gères déjà ${MAX_MANAGED_SCHOOLS} écoles.`);
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
				organization: { create: { kind: 'SCHOOL', school: { create: { kind: form.kind } } } }
			},
			select: { id: true, handle: true }
		});
		await tx.membership.create({
			data: { orgId: actor.id, personId, role: 'OWNER', status: 'ACTIVE', startedAt: now }
		});
		return actor;
	}, ORG_TX);
}

/** Les écoles dont je fais partie : comme prof (gestion) ou comme élève. */
export async function mySchools(personId: string) {
	const rows = await prisma.membership.findMany({
		where: { personId, status: 'ACTIVE', org: liveSchool },
		orderBy: { startedAt: 'asc' },
		select: {
			role: true,
			org: {
				select: {
					school: { select: { kind: true } },
					actor: { select: { handle: true, displayName: true } }
				}
			}
		}
	});
	return rows.map((r) => ({
		handle: r.org.actor.handle,
		name: r.org.actor.displayName,
		kind: (r.org.school?.kind ?? 'MUSIC_SCHOOL') as SchoolKindValue,
		manager: r.role !== 'MEMBER'
	}));
}

/**
 * Une école pour l'un de ses membres : son nom, son type, mon rôle. `null`
 * si je n'en fais pas partie (la page répond 404 : pas de page publique).
 */
export async function schoolForMember(handle: string, personId: string) {
	const org = await prisma.organization.findFirst({
		where: { ...liveSchool, actor: { handle, deletedAt: null } },
		select: {
			actorId: true,
			verifiedAt: true,
			school: { select: { kind: true } },
			actor: { select: { handle: true, displayName: true } },
			memberships: {
				where: { personId, status: 'ACTIVE' },
				select: { id: true, role: true }
			}
		}
	});
	const mine = org?.memberships[0];
	if (!org || !mine) return null;
	return {
		id: org.actorId,
		handle: org.actor.handle,
		name: org.actor.displayName,
		kind: (org.school?.kind ?? 'MUSIC_SCHOOL') as SchoolKindValue,
		verified: org.verifiedAt !== null,
		membershipId: mine.id,
		manager: mine.role !== 'MEMBER',
		owner: mine.role === 'OWNER'
	};
}

// ─── Liens d'invitation ──────────────────────────────────────────────────

/** Créer un lien : renvoie le jeton, montré une seule fois (seul son hachage est gardé). */
export async function createSchoolInvite(
	handle: string,
	managerId: string,
	maxUses = DEFAULT_INVITE_USES,
	now = new Date()
) {
	const school = await managedSchool(prisma, handle, managerId);
	const token = randomBytes(24).toString('base64url');
	await prisma.$transaction(async (tx) => {
		await lockOrg(tx, school.id);
		await managedSchool(tx, handle, managerId);
		const active = await tx.schoolInvite.count({
			where: { orgId: school.id, revokedAt: null, expiresAt: { gt: now } }
		});
		if (active >= MAX_ACTIVE_INVITES) {
			throw new SchoolError(
				`${MAX_ACTIVE_INVITES} liens actifs au plus : retire un ancien lien d’abord.`
			);
		}
		await tx.schoolInvite.create({
			data: {
				orgId: school.id,
				tokenHash: hashInviteToken(token),
				createdById: managerId,
				maxUses,
				expiresAt: new Date(now.getTime() + INVITE_DAYS * DAY)
			}
		});
	}, ORG_TX);
	return token;
}

/** Liens actifs de l'école (sans jeton), pour sa gestion. */
export async function schoolInvites(handle: string, managerId: string, now = new Date()) {
	const school = await managedSchool(prisma, handle, managerId);
	const rows = await prisma.schoolInvite.findMany({
		where: { orgId: school.id, revokedAt: null, expiresAt: { gt: now } },
		orderBy: { createdAt: 'desc' },
		select: { id: true, uses: true, maxUses: true, expiresAt: true, createdAt: true }
	});
	return rows;
}

export async function revokeSchoolInvite(handle: string, managerId: string, inviteId: string) {
	const school = await managedSchool(prisma, handle, managerId);
	await prisma.$transaction(async (tx) => {
		await lockOrg(tx, school.id);
		await managedSchool(tx, handle, managerId);
		const { count } = await tx.schoolInvite.updateMany({
			where: { id: inviteId, orgId: school.id, revokedAt: null },
			data: { revokedAt: new Date() }
		});
		if (count === 0) throw new SchoolError('Ce lien n’est déjà plus valable.', 404);
	}, ORG_TX);
}

async function findInvite(db: Tx | typeof prisma, token: string) {
	if (!INVITE_TOKEN.test(token)) return null;
	return db.schoolInvite.findFirst({
		where: { tokenHash: hashInviteToken(token), org: liveSchool },
		select: {
			id: true,
			orgId: true,
			uses: true,
			maxUses: true,
			expiresAt: true,
			revokedAt: true,
			org: { select: { actor: { select: { handle: true, displayName: true } } } }
		}
	});
}

/** Ce que montre la page du lien : le nom de l'école, et s'il sert encore. */
export async function previewSchoolInvite(
	token: string,
	personId: string | null,
	now = new Date()
) {
	const invite = await findInvite(prisma, token);
	if (!invite) return null;
	const member = personId
		? (await prisma.membership.count({
				where: { orgId: invite.orgId, personId, status: 'ACTIVE' }
			})) > 0
		: false;
	const state = inviteState(invite, now);
	return {
		name: invite.org.actor.displayName,
		handle: invite.org.actor.handle,
		member,
		error: state === 'OK' ? null : INVITE_STATE_MESSAGES[state]
	};
}

/** Suivre le lien : la personne devient membre de l'école. Renvoie son nom d'utilisateur. */
export async function joinSchoolWithInvite(token: string, personId: string, now = new Date()) {
	return prisma.$transaction(async (tx) => {
		const initial = await findInvite(tx, token);
		if (!initial) throw new SchoolError('Ce lien n’existe pas.', 404);
		await lockOrg(tx, initial.orgId);
		// Relire le lien et l’école vivante après attente du verrou.
		const invite = await findInvite(tx, token);
		if (!invite) throw new SchoolError('Ce lien n’existe pas.', 404);
		const handle = invite.org.actor.handle;
		const open = await tx.membership.findFirst({
			where: { orgId: invite.orgId, personId, status: { in: ['ACTIVE', 'INVITED', 'REQUESTED'] } },
			select: { id: true, status: true }
		});
		if (open?.status === 'ACTIVE') return handle;
		const state = inviteState(invite, now);
		if (state !== 'OK') throw new SchoolError(INVITE_STATE_MESSAGES[state], 410);
		// L'usage se compte de façon atomique : jamais au-delà du plafond.
		const { count } = await tx.schoolInvite.updateMany({
			where: { id: invite.id, uses: { lt: invite.maxUses }, revokedAt: null },
			data: { uses: { increment: 1 } }
		});
		if (count === 0) throw new SchoolError(INVITE_STATE_MESSAGES.FULL, 410);
		// Une période en attente est conservée, avec ses éventuels actes antérieurs.
		const data = {
			role: 'MEMBER' as const,
			status: 'ACTIVE' as const,
			startedAt: now,
			decisions: { create: { kind: 'ACCEPTED' as const, authorId: personId, occurredAt: now } }
		};
		if (open) await tx.membership.update({ where: { id: open.id }, data });
		else await tx.membership.create({ data: { orgId: invite.orgId, personId, ...data } });
		return handle;
	}, ORG_TX);
}

// ─── Élèves ──────────────────────────────────────────────────────────────

/** Les élèves, pour la seule gestion de l'école (jamais en public). */
export async function schoolStudents(handle: string, managerId: string) {
	const school = await managedSchool(prisma, handle, managerId);
	const rows = await prisma.membership.findMany({
		where: { orgId: school.id, status: 'ACTIVE', role: 'MEMBER', person: { deletedAt: null } },
		orderBy: { startedAt: 'asc' },
		select: {
			id: true,
			startedAt: true,
			person: { select: { handle: true, displayName: true } }
		}
	});
	return rows.map((r) => ({
		membershipId: r.id,
		handle: r.person.handle,
		displayName: r.person.displayName,
		since: r.startedAt
	}));
}

/** Retirer un·e élève (la gestion), ou quitter l'école (l'élève). */
export async function leaveOrRemoveStudent(
	handle: string,
	byId: string,
	membershipId: string,
	now = new Date()
) {
	return prisma.$transaction(async (tx) => {
		const target = await tx.membership.findUnique({
			where: { id: membershipId },
			select: { orgId: true }
		});
		if (!target) throw new SchoolError('Cette personne ne fait plus partie de l’école.', 404);
		await lockOrg(tx, target.orgId);
		const row = await tx.membership.findFirst({
			where: {
				id: membershipId,
				status: 'ACTIVE',
				org: { ...liveSchool, actor: { handle, deletedAt: null } }
			},
			select: { id: true, personId: true, role: true }
		});
		if (!row) throw new SchoolError('Cette personne ne fait plus partie de l’école.', 404);
		if (row.role !== 'MEMBER') {
			throw new SchoolError(
				'La personne responsable ne quitte pas son école : la co-gestion arrive bientôt.'
			);
		}
		const self = row.personId === byId;
		if (!self) await managedSchool(tx, handle, byId);
		await tx.membership.update({
			where: { id: row.id },
			data: {
				status: self ? 'LEFT' : 'REMOVED',
				endedAt: now,
				decisions: { create: { kind: self ? 'LEFT' : 'REMOVED', authorId: byId, occurredAt: now } }
			}
		});
	}, ORG_TX);
}

// ─── Ateliers ────────────────────────────────────────────────────────────

/** Publier un atelier jam au nom de l'école : réservé à ses membres, lead = la personne qui publie. */
export async function createWorkshop(
	handle: string,
	managerId: string,
	form: JamForm,
	now = new Date()
) {
	const school = await managedSchool(prisma, handle, managerId);
	if (!(await isAdultPerson(managerId, now))) {
		throw new SchoolError('Il faut être majeur·e pour publier un atelier.', 403);
	}
	const window = checkJamWindow(form, now);
	if (!window.ok) throw new SchoolError(window.error);
	const venue = await getVenue(form.venueId, managerId);
	if (!venue) throw new SchoolError('Choisis un lieu de l’annuaire.');
	if (!venue.validated) {
		throw new SchoolError(
			'Ce lieu attend la confirmation d’un autre membre avant d’accueillir un atelier.'
		);
	}
	const open = await prisma.opportunity.count({
		where: { issuerActorId: school.id, kind: 'JAM', status: 'OPEN', expiresAt: { gt: now } }
	});
	if (open >= MAX_OPEN_WORKSHOPS) {
		throw new SchoolError(`${MAX_OPEN_WORKSHOPS} ateliers à venir au plus.`);
	}
	const [instruments, genre] = await Promise.all([
		prisma.instrument.findMany({
			where: { slug: { in: form.spots.map((s) => s.instrument) }, active: true },
			select: { id: true, slug: true }
		}),
		form.genre ? prisma.genre.findFirst({ where: { slug: form.genre, active: true } }) : null
	]);
	if (instruments.length !== form.spots.length) throw new SchoolError('Instrument inconnu.');
	if (form.genre && !genre) throw new SchoolError('Genre inconnu.');
	const idOf = new Map(instruments.map((i) => [i.slug, i.id]));
	return prisma.opportunity.create({
		data: {
			issuerActorId: school.id,
			postedById: managerId,
			leadActorId: managerId,
			audience: 'SCHOOL',
			kind: 'JAM',
			title: form.title,
			description: form.description,
			genreSlug: genre?.slug ?? null,
			startsAt: window.startsAt,
			endsAt: window.endsAt,
			venueId: venue.id,
			backline: venue.backline,
			expiresAt: window.endsAt,
			slots: Math.max(
				1,
				form.spots.reduce((n, s) => n + s.count, 0)
			),
			jamSpots: {
				create: form.spots.map((s) => ({ instrumentId: idOf.get(s.instrument)!, count: s.count }))
			}
		},
		select: { id: true }
	});
}

/** Faits de la quête « De l'atelier à la scène » : ateliers et jams publiques où l'on vient. */
export async function workshopQuestFacts(personId: string) {
	const [schools, workshops, publicJams] = await Promise.all([
		prisma.membership.count({
			where: { personId, status: 'ACTIVE', role: 'MEMBER', org: liveSchool }
		}),
		prisma.jamAttendance.count({
			where: { actorId: personId, removedAt: null, opportunity: { audience: 'SCHOOL' } }
		}),
		prisma.jamAttendance.count({
			where: {
				actorId: personId,
				removedAt: null,
				opportunity: { audience: 'PUBLIC', kind: 'JAM' }
			}
		})
	]);
	return { schools, workshops, publicJams };
}
