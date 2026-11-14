/** DASH-02b : agences privées ; adhésion distincte de tout mandat artistique. */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { suggestHandle } from '#lib/actors/handle';
import { adultBirthCutoff } from '#lib/actors/visibility';
import { notify } from '#lib/server/notifications/service';
import { structureAccess, liveStructure } from '#lib/server/organizations/access';
import { lockOrg, ORG_TX } from '#lib/server/organizations/comanagement';
import {
	agencyNameSchema,
	agencyInviteSchema,
	MAX_AGENCIES,
	MAX_AGENCY_INVITES,
	mayInviteAgencyRole,
	mayRemoveAgencyMember
} from '#lib/agencies/rules';
type Db = Prisma.TransactionClient | typeof prisma;
export class AgencyError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}
const live = () => liveStructure('AGENCY');
const adult = (id: string) => ({
	id,
	kind: 'PERSON' as const,
	deletedAt: null,
	person: { birthDate: { lte: adultBirthCutoff() } }
});
async function eligible(db: Db, id: string, manager = false) {
	return !!(await db.actor.findFirst({
		where: {
			...adult(id),
			...(manager
				? {
						person: {
							birthDate: { lte: adultBirthCutoff() },
							tracks: { some: { track: { in: ['MANAGER', 'BOOKER'] } } }
						}
					}
				: {})
		},
		select: { id: true }
	}));
}
export const canCreateAgency = (id: string) => eligible(prisma, id, true);
async function access(db: Db, orgId: string, personId: string) {
	const result = await structureAccess(db, orgId, personId, 'AGENCY');
	if (!result || !(await eligible(db, personId)))
		throw new AgencyError('Participation introuvable.', 404);
	return result;
}
async function manager(db: Db, orgId: string, personId: string) {
	const result = await access(db, orgId, personId);
	if (!result.permissions.includes('agency.manage'))
		throw new AgencyError('Réservé à la gestion de l’agence.', 403);
	return result;
}
async function blocked(db: Db, a: string, b: string) {
	return !!(await db.block.count({
		where: {
			OR: [
				{ blockerActorId: a, blockedActorId: b },
				{ blockerActorId: b, blockedActorId: a }
			]
		}
	}));
}
export async function createAgency(personId: string, input: unknown) {
	const parsed = agencyNameSchema.safeParse(input);
	if (!parsed.success) throw new AgencyError(parsed.error.issues[0].message);
	return prisma.$transaction(async (tx) => {
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`agency-owner:${personId}`}))`;
		if (!(await eligible(tx, personId, true)))
			throw new AgencyError(
				'Créer une agence demande le métier Manager ou Booker et la majorité.',
				403
			);
		if (
			(await tx.membership.count({
				where: { personId, role: 'OWNER', status: 'ACTIVE', org: live() }
			})) >= MAX_AGENCIES
		)
			throw new AgencyError(`Tu peux ouvrir ${MAX_AGENCIES} agences au plus.`);
		const handle = await suggestHandle(
			parsed.data.name,
			async (candidate) =>
				!!(await tx.actor.findUnique({ where: { handle: candidate }, select: { id: true } }))
		);
		const org = await tx.actor.create({
			data: {
				kind: 'ORGANIZATION',
				hidden: true,
				handle,
				displayName: parsed.data.name,
				organization: { create: { kind: 'AGENCY' } }
			},
			select: { id: true }
		});
		await tx.membership.create({
			data: { orgId: org.id, personId, role: 'OWNER', status: 'ACTIVE', startedAt: new Date() }
		});
		return org;
	}, ORG_TX);
}
export async function inviteAgencyMember(orgId: string, byId: string, input: unknown) {
	const parsed = agencyInviteSchema.safeParse(input);
	if (!parsed.success) throw new AgencyError(parsed.error.issues[0].message);
	return prisma.$transaction(async (tx) => {
		await lockOrg(tx, orgId);
		const me = await manager(tx, orgId, byId);
		if (!mayInviteAgencyRole(me.role, parsed.data.role))
			throw new AgencyError('Seul·e la personne responsable invite à la co-gestion.', 403);
		const target = await tx.actor.findFirst({
			where: {
				handle: parsed.data.handle.replace(/^@/, '').toLowerCase(),
				...{ kind: 'PERSON', deletedAt: null }
			},
			select: { id: true }
		});
		if (
			!target ||
			target.id === byId ||
			!(await eligible(tx, target.id, parsed.data.role === 'ADMIN')) ||
			(await blocked(tx, byId, target.id))
		)
			throw new AgencyError('Impossible d’inviter cette personne.', 403);
		if (
			await tx.membership.count({
				where: { orgId, personId: target.id, status: { in: ['INVITED', 'REQUESTED', 'ACTIVE'] } }
			})
		)
			throw new AgencyError('Cette personne participe déjà ou attend une réponse.');
		if ((await tx.membership.count({ where: { orgId, status: 'INVITED' } })) >= MAX_AGENCY_INVITES)
			throw new AgencyError('Cinq invitations en attente au plus.');
		await tx.membership.create({
			data: {
				orgId,
				personId: target.id,
				role: parsed.data.role,
				status: 'INVITED',
				invitedById: byId
			}
		});
		const agency = await tx.actor.findUniqueOrThrow({
			where: { id: orgId },
			select: { displayName: true }
		});
		await notify(tx, {
			recipientId: target.id,
			type: 'ORG_INVITE',
			fromActorId: byId,
			href: `/agences/${orgId}/participation`,
			title: agency.displayName
		});
	}, ORG_TX);
}
export async function answerAgencyInvite(orgId: string, personId: string, accept: boolean) {
	await prisma.$transaction(async (tx) => {
		await lockOrg(tx, orgId);
		const row = await tx.membership.findFirst({
			where: { orgId, personId, status: 'INVITED', org: live() }
		});
		if (!row) throw new AgencyError('Invitation introuvable.', 404);
		if (accept) {
			if (!(await eligible(tx, personId, row.role === 'ADMIN')))
				throw new AgencyError(
					'La majorité et, en co-gestion, le métier Manager ou Booker sont nécessaires.',
					403
				);
			// L’invitation ne survit pas à la perte de droit de son auteur.
			const inviter = row.invitedById
				? await structureAccess(tx, orgId, row.invitedById, 'AGENCY')
				: null;
			if (
				!inviter ||
				!row.invitedById ||
				!(await eligible(tx, row.invitedById)) ||
				!mayInviteAgencyRole(inviter.role, row.role) ||
				(await blocked(tx, row.invitedById, personId))
			)
				throw new AgencyError('Cette invitation n’est plus valable.', 403);
		}
		const now = new Date();
		await tx.membership.update({
			where: { id: row.id },
			data: accept ? { status: 'ACTIVE', startedAt: now } : { status: 'DECLINED', endedAt: now }
		});
		await tx.membershipDecision.create({
			data: {
				membershipId: row.id,
				kind: accept ? 'ACCEPTED' : 'DECLINED',
				authorId: personId,
				occurredAt: now
			}
		});
	}, ORG_TX);
}
export async function removeAgencyMember(orgId: string, byId: string, membershipId: string) {
	await prisma.$transaction(async (tx) => {
		await lockOrg(tx, orgId);
		const me = await access(tx, orgId, byId);
		const target = await tx.membership.findFirst({
			where: { id: membershipId, orgId, status: { in: ['ACTIVE', 'INVITED'] }, org: live() }
		});
		if (!target) throw new AgencyError('Participation introuvable.', 404);
		const self = target.personId === byId;
		if (!mayRemoveAgencyMember(me.role, target.role, target.status, self))
			throw new AgencyError('Seule la personne responsable retire une participation active.', 403);
		const now = new Date();
		if (target.role === 'OWNER') {
			const next = await tx.membership.findFirst({
				where: {
					orgId,
					role: 'ADMIN',
					status: 'ACTIVE',
					personId: { not: byId },
					person: adultBirthPerson()
				},
				orderBy: [{ startedAt: 'asc' }, { id: 'asc' }]
			});
			if (!next)
				throw new AgencyError(
					'Invite une personne à la co-gestion avant de passer le relais, ou ferme l’agence.'
				);
			await tx.membership.update({ where: { id: next.id }, data: { role: 'OWNER' } });
			await tx.membershipDecision.create({
				data: {
					membershipId: next.id,
					kind: 'RESPONSIBILITY_RECEIVED',
					authorId: byId,
					occurredAt: now
				}
			});
		}
		await tx.membership.update({
			where: { id: target.id },
			data: {
				status: target.status === 'INVITED' ? 'DECLINED' : self ? 'LEFT' : 'REMOVED',
				endedAt: now
			}
		});
		await tx.membershipDecision.create({
			data: {
				membershipId: target.id,
				kind:
					target.status === 'INVITED'
						? self
							? 'DECLINED'
							: 'WITHDRAWN'
						: self
							? 'LEFT'
							: 'REMOVED',
				authorId: byId,
				occurredAt: now
			}
		});
	}, ORG_TX);
}
const adultBirthPerson = () => ({
	deletedAt: null,
	person: { birthDate: { lte: adultBirthCutoff() } }
});
export async function closeAgency(orgId: string, byId: string) {
	await prisma.$transaction(async (tx) => {
		await lockOrg(tx, orgId);
		if ((await manager(tx, orgId, byId)).role !== 'OWNER')
			throw new AgencyError('Seule la personne responsable ferme l’agence.', 403);
		const now = new Date();
		const periods = await tx.membership.findMany({
			where: { orgId, status: { in: ['ACTIVE', 'INVITED', 'REQUESTED'] } },
			select: { id: true, status: true }
		});
		await tx.organization.update({ where: { actorId: orgId }, data: { dissolvedAt: now } });
		await tx.membership.updateMany({
			where: { orgId, status: 'ACTIVE' },
			data: { status: 'REMOVED', endedAt: now }
		});
		await tx.membership.updateMany({
			where: { orgId, status: { in: ['INVITED', 'REQUESTED'] } },
			data: { status: 'DECLINED', endedAt: now }
		});
		await tx.membershipDecision.createMany({
			data: periods.map((period) => ({
				membershipId: period.id,
				kind: period.status === 'ACTIVE' ? ('REMOVED' as const) : ('WITHDRAWN' as const),
				authorId: byId,
				occurredAt: now
			}))
		});
	}, ORG_TX);
}
/** Invitation : seules mes conditions, sans équipe. Collaborateur : aucune liste. */
export async function agencyForMe(orgId: string, personId: string) {
	if (!(await eligible(prisma, personId))) return null;
	const row = await prisma.membership.findFirst({
		where: { orgId, personId, status: { in: ['ACTIVE', 'INVITED'] }, org: live() },
		select: {
			id: true,
			role: true,
			status: true,
			org: { select: { actor: { select: { displayName: true } } } }
		}
	});
	return row
		? {
				id: orgId,
				membershipId: row.id,
				name: row.org.actor.displayName,
				role: row.role,
				status: row.status
			}
		: null;
}
export async function agencyTeam(orgId: string, personId: string) {
	// Même verrou que les mutations : aucune équipe lue après une révocation validée.
	return prisma.$transaction(async (tx) => {
		await lockOrg(tx, orgId);
		await manager(tx, orgId, personId);
		return tx.membership.findMany({
			where: { orgId, status: { in: ['ACTIVE', 'INVITED'] } },
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
			select: {
				id: true,
				role: true,
				status: true,
				personId: true,
				person: { select: { displayName: true, handle: true } }
			}
		});
	}, ORG_TX);
}
