/**
 * Co-gestion d'une organisation (P5-05b, P5-03b) : inviter à gérer (ADMIN),
 * accepter ou décliner, retirer ou partir. Commun aux organisations
 * d'organisateur·rices (`PROMOTER`) et aux lieux (`VENUE`) ; le studio
 * (P4-03b) a gardé sa copie d'origine.
 *
 * Règles : on n'invite ni soi-même, ni une personne bloquée, ni quelqu'un
 * qui gère déjà ou est déjà invité·e ; cinq invitations en attente au plus.
 * Seul·e la ou le responsable retire quelqu'un (une invitation peut être
 * annulée par toute la gestion) ; qui part en étant responsable transmet
 * (`successorOf`) ; seul·e, on ne part pas. Tout se passe sous un verrou
 * par organisation.
 */
import type { NotificationType, OrgKind, Prisma } from '@prisma/client';
import { structureAccess } from './access';
import { prisma } from '#lib/server';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { notify } from '#lib/server/notifications/service';
import { isManager, successorOf } from '#lib/bands/rules';

export class CoManagementError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

type Tx = Prisma.TransactionClient;
export const ORG_TX = { timeout: 20_000 } as const;
export const MAX_PENDING_INVITES = 5;

export type CoManaged = {
	kind: Extract<OrgKind, 'PROMOTER' | 'VENUE'>;
	/** « cette organisation », « ce lieu » : complément des phrases. */
	noun: string;
	/** Organisations de ce type gérées par une même personne. */
	maxManaged: number;
	/** Qui peut être invité·e (métier, majorité…). */
	canBeInvited: (personId: string) => Promise<boolean>;
	/** Message quand le nom d'utilisateur ne convient pas. */
	notEligible: string;
	notification: Extract<NotificationType, 'ORG_INVITE'>;
	/** Où l'invitation se lit. */
	inviteHref: string;
};

export const liveOrgOf = (kind: CoManaged['kind']) =>
	({ kind, dissolvedAt: null, actor: { deletedAt: null } }) as const;

export async function lockOrg(tx: Tx, orgId: string) {
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`org:${orgId}`}))`;
}

/** La personne gère-t-elle l'organisation (OWNER, ADMIN) ? Sinon une erreur. */
export async function requireOrgManager(
	c: Pick<CoManaged, 'kind' | 'noun'>,
	tx: Tx | typeof prisma,
	orgId: string,
	personId: string
) {
	const mine = await structureAccess(tx, orgId, personId, c.kind);
	if (!mine) throw new CoManagementError(`${capitalize(c.noun)} n’existe plus.`, 404);
	if (!mine.permissions.includes('manage'))
		throw new CoManagementError(`Seules les personnes qui gèrent ${c.noun} la modifient.`, 403);
	return mine.role;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const managedCount = (
	c: Pick<CoManaged, 'kind'>,
	db: Tx | typeof prisma,
	personId: string
) =>
	db.membership.count({
		where: {
			personId,
			status: 'ACTIVE',
			role: { in: ['OWNER', 'ADMIN'] },
			org: liveOrgOf(c.kind)
		}
	});

/** Inviter une personne à la co-gestion (ADMIN). Renvoie son nom. */
export async function inviteManager(
	c: CoManaged,
	orgId: string,
	managerId: string,
	handle: string
) {
	const invitee = await prisma.actor.findFirst({
		where: {
			handle: handle.trim().replace(/^@/, '').toLowerCase(),
			kind: 'PERSON',
			deletedAt: null
		},
		select: { id: true, displayName: true }
	});
	if (!invitee || !(await c.canBeInvited(invitee.id))) {
		throw new CoManagementError(c.notEligible, 404);
	}
	if (invitee.id === managerId) throw new CoManagementError(`Tu gères déjà ${c.noun}.`);
	if (await isBlockedBetween(managerId, invitee.id)) {
		throw new CoManagementError('Impossible d’inviter cette personne.', 403);
	}
	await prisma.$transaction(async (tx) => {
		await lockOrg(tx, orgId);
		await requireOrgManager(c, tx, orgId, managerId);
		const open = await tx.membership.findFirst({
			where: { orgId, personId: invitee.id, status: { in: ['INVITED', 'REQUESTED', 'ACTIVE'] } },
			select: { status: true }
		});
		if (open) {
			throw new CoManagementError(
				open.status === 'ACTIVE'
					? `${invitee.displayName} gère déjà ${c.noun}.`
					: `${invitee.displayName} est déjà invité·e.`
			);
		}
		const pending = await tx.membership.count({ where: { orgId, status: 'INVITED' } });
		if (pending >= MAX_PENDING_INVITES) {
			throw new CoManagementError(`${MAX_PENDING_INVITES} invitations en attente au plus.`);
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
			type: c.notification,
			fromActorId: managerId,
			href: c.inviteHref,
			title: org.displayName
		});
	}, ORG_TX);
	return invitee.displayName;
}

/** Accepter ou décliner une invitation à la co-gestion. */
export async function answerInvite(
	c: CoManaged,
	membershipId: string,
	personId: string,
	accept: boolean
) {
	await prisma.$transaction(async (tx) => {
		const invite = await tx.membership.findFirst({
			where: { id: membershipId, personId, status: 'INVITED', org: liveOrgOf(c.kind) },
			select: { orgId: true }
		});
		if (!invite) throw new CoManagementError('Cette invitation n’est plus valable.', 404);
		await lockOrg(tx, invite.orgId);
		const current = await tx.membership.findFirst({
			where: { id: membershipId, personId, status: 'INVITED', org: liveOrgOf(c.kind) },
			select: { id: true }
		});
		if (!current) throw new CoManagementError('Cette invitation n’est plus valable.', 404);
		if (accept && (await managedCount(c, tx, personId)) >= c.maxManaged) {
			throw new CoManagementError(`Tu en gères déjà ${c.maxManaged}.`);
		}
		await tx.membership.update({
			where: { id: membershipId },
			data: accept
				? { status: 'ACTIVE', startedAt: new Date() }
				: { status: 'DECLINED', endedAt: new Date() }
		});
	}, ORG_TX);
}

/** Retirer une personne de la gestion, annuler une invitation, ou partir. */
export async function leaveOrRemoveManager(
	c: CoManaged,
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
			throw new CoManagementError('Cette personne ne fait plus partie de la gestion.', 404);
		const self = target.personId === byId;
		if (!self) {
			const me = await tx.membership.findFirst({
				where: { orgId, personId: byId, status: 'ACTIVE', org: liveOrgOf(c.kind) },
				select: { role: true }
			});
			const allowed = me?.role === 'OWNER' || (isManager(me?.role) && target.status === 'INVITED');
			if (!allowed)
				throw new CoManagementError('Seul·e la ou le responsable retire quelqu’un.', 403);
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
				throw new CoManagementError(
					`Tu es seul·e à gérer ${c.noun} : invite quelqu’un pour te passer le relais.`
				);
			}
			await tx.membership.update({ where: { id: next.id }, data: { role: 'OWNER' } });
		}
		await tx.membership.update({
			where: { id: target.id },
			data: { status: self ? 'LEFT' : 'REMOVED', endedAt: now }
		});
	}, ORG_TX);
}

/** Invitations en attente pour la personne, sur un type d'organisation. */
export async function invitesFor(kind: CoManaged['kind'], personId: string) {
	const rows = await prisma.membership.findMany({
		where: { personId, status: 'INVITED', org: liveOrgOf(kind) },
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

/** L'équipe (gestion active et invitations), pour la page de gestion. */
export async function teamOf(orgId: string, personId: string) {
	const access = await structureAccess(prisma, orgId, personId);
	if (!access?.permissions.includes('manage') || !['PROMOTER', 'VENUE'].includes(access.kind))
		throw new CoManagementError('Cette équipe est réservée à sa gestion.', 403);
	const rows = await prisma.membership.findMany({
		where: { orgId, status: { in: ['ACTIVE', 'INVITED'] } },
		orderBy: { createdAt: 'asc' },
		select: {
			id: true,
			role: true,
			status: true,
			person: { select: { id: true, handle: true, displayName: true } }
		}
	});
	return rows.map((m) => ({
		membershipId: m.id,
		handle: m.person.handle,
		displayName: m.person.displayName,
		role: m.role,
		status: m.status,
		isMe: m.person.id === personId
	}));
}
