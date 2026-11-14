import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { notify } from '#lib/server/notifications/service';
import { lockOrg } from '#lib/server/organizations/comanagement';
import { isIndexable } from '#lib/actors/visibility';
import { RepresentationError, endRepresentation } from './service';
import { delegationProposalSchema, delegationAllows } from '#lib/representation/delegations';
import { delegationTimeline } from '#lib/activity/timeline';
import {
	artistAnswerers,
	delegationInclude,
	delegationBaseActive,
	type DelegationRow
} from './delegationAccess';
const TX = { timeout: 20_000 };
async function lock(tx: Prisma.TransactionClient, artistId: string, agencyId: string) {
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`band:${artistId}`}))`;
	await lockOrg(tx, agencyId);
}
const liveAgency = { kind: 'AGENCY' as const, dissolvedAt: null, actor: { deletedAt: null } };
export async function delegationOptions(personId: string) {
	const [mandates, agencies] = await Promise.all([
		prisma.representation.findMany({
			where: { agentId: personId, status: 'CONFIRMED', artist: { deletedAt: null } },
			select: { id: true, kind: true, artist: { select: { displayName: true } } }
		}),
		prisma.membership.findMany({
			where: { personId, status: 'ACTIVE', org: liveAgency },
			select: { orgId: true, org: { select: { actor: { select: { displayName: true } } } } }
		})
	]);
	return {
		mandates,
		agencies: agencies.map((a) => ({ id: a.orgId, name: a.org.actor.displayName }))
	};
}
export async function proposeDelegation(personId: string, input: unknown, now = new Date()) {
	const parsed = delegationProposalSchema.safeParse(input);
	if (!parsed.success)
		throw new RepresentationError(parsed.error.issues[0]?.message ?? 'Vérifie la proposition.');
	const data = parsed.data;
	const parent = await prisma.representation.findUnique({
		where: { id: data.representationId },
		select: { artistId: true }
	});
	if (!parent) throw new RepresentationError('Accompagnement introuvable.', 404);
	return prisma.$transaction(async (tx) => {
		await lock(tx, parent.artistId, data.agencyId);
		const p = await tx.representation.findUnique({ where: { id: data.representationId } });
		if (!p || p.agentId !== personId || p.status !== 'CONFIRMED')
			throw new RepresentationError(
				'Seul l’agent titulaire propose une affectation sur son mandat confirmé.',
				403
			);
		const delegate = await tx.actor.findFirst({
			where: {
				handle: data.delegate.replace(/^@/, '').toLowerCase(),
				kind: 'PERSON',
				deletedAt: null
			},
			select: { id: true, person: { select: { birthDate: true } } }
		});
		if (!delegate || delegate.id === personId || !isIndexable(delegate.person?.birthDate, now))
			throw new RepresentationError('Collaborateur indisponible.', 403);
		const [a, d] = await Promise.all([
			tx.membership.findFirst({
				where: { orgId: data.agencyId, personId, status: 'ACTIVE', org: liveAgency }
			}),
			tx.membership.findFirst({
				where: { orgId: data.agencyId, personId: delegate.id, status: 'ACTIVE', org: liveAgency }
			})
		]);
		if (!a || !d)
			throw new RepresentationError(
				'Les deux personnes doivent participer activement à la même agence.',
				403
			);
		const expiresAt = data.expiresOn ? new Date(data.expiresOn) : p.expiresAt;
		if (expiresAt && (expiresAt <= now || (p.expiresAt && expiresAt > p.expiresAt)))
			throw new RepresentationError('La fin doit être future et comprise dans le mandat parent.');
		const old = await tx.representationDelegation.findFirst({
			where: {
				representationId: p.id,
				agencyId: data.agencyId,
				delegateId: delegate.id,
				endedAt: null
			}
		});
		if (old)
			throw new RepresentationError(
				'Une affectation existe déjà : retire-la avant de la remplacer.'
			);
		if (
			(await tx.representationDelegation.count({
				where: { representationId: p.id, endedAt: null }
			})) >= 10
		)
			throw new RepresentationError('Dix affectations ouvertes au plus par mandat.');
		const row = await tx.representationDelegation.create({
			data: {
				representationId: p.id,
				agencyId: data.agencyId,
				delegateId: delegate.id,
				agentMembershipId: a.id,
				delegateMembershipId: d.id,
				proposedById: personId,
				expiresAt,
				actions: ['VIEW_MANDATE', ...(data.allowEnd ? ['END_MANDATE'] : [])]
			},
			include: delegationInclude
		});
		if (!(await delegationBaseActive(tx, row, now)))
			throw new RepresentationError(
				'Ce mandat ou cette participation ne permet plus de déléguer.',
				403
			);
		const recipients = [...new Set([delegate.id, ...(await artistAnswerers(tx, p.artistId, now))])];
		for (const id of recipients)
			await notify(tx, {
				recipientId: id,
				type: 'DELEGATION_REQUEST',
				fromActorId: personId,
				href: `/delegations/${row.id}`,
				title: `Affectation pour ${row.representation.artist.displayName}`
			});
		return row.id;
	}, TX);
}
async function mutate(
	id: string,
	fn: (tx: Prisma.TransactionClient, row: DelegationRow) => Promise<void>
) {
	const first = await prisma.representationDelegation.findUnique({
		where: { id },
		select: { agencyId: true, representation: { select: { artistId: true } } }
	});
	if (!first) throw new RepresentationError('Affectation introuvable.', 404);
	await prisma.$transaction(async (tx) => {
		await lock(tx, first.representation.artistId, first.agencyId);
		const row = await tx.representationDelegation.findUnique({
			where: { id },
			include: delegationInclude
		});
		if (!row || row.endedAt) throw new RepresentationError('Cette affectation est terminée.', 404);
		await fn(tx, row);
	}, TX);
}
export async function answerDelegation(
	id: string,
	byId: string,
	accept: boolean,
	now = new Date()
) {
	await mutate(id, async (tx, row) => {
		if (row.delegateId !== byId)
			throw new RepresentationError('Seul le collaborateur répond à son invitation.', 403);
		if (!accept) {
			await tx.representationDelegation.update({
				where: { id },
				data: { endedAt: now, endedById: byId }
			});
			return;
		}
		if (row.acceptedAt) throw new RepresentationError('Invitation déjà acceptée.');
		if (!(await delegationBaseActive(tx, row, now)))
			throw new RepresentationError('Cette affectation n’est plus valable.', 403);
		await tx.representationDelegation.update({ where: { id }, data: { acceptedAt: now } });
	});
}
export async function approveDelegation(
	id: string,
	byId: string,
	accept: boolean,
	now = new Date()
) {
	await mutate(id, async (tx, row) => {
		if (!(await artistAnswerers(tx, row.representation.artistId, now)).includes(byId))
			throw new RepresentationError(
				'Seul l’artiste ou la gestion actuelle du groupe approuve.',
				403
			);
		if (!accept) {
			await tx.representationDelegation.update({
				where: { id },
				data: { endedAt: now, endedById: byId }
			});
			return;
		}
		if (row.approvedAt) throw new RepresentationError('Affectation déjà approuvée.');
		if (!(await delegationBaseActive(tx, row, now)))
			throw new RepresentationError('Cette affectation n’est plus valable.', 403);
		await tx.representationDelegation.update({
			where: { id },
			data: { approvedAt: now, approvedById: byId }
		});
	});
}
export async function revokeDelegation(id: string, byId: string, now = new Date()) {
	await mutate(id, async (tx, row) => {
		if (
			byId !== row.representation.agentId &&
			byId !== row.delegateId &&
			!(await artistAnswerers(tx, row.representation.artistId, now)).includes(byId)
		)
			throw new RepresentationError('Seules les parties concernées retirent l’affectation.', 403);
		await tx.representationDelegation.update({
			where: { id },
			data: { endedAt: now, endedById: byId }
		});
	});
}
export async function delegationForMe(id: string, personId: string, now = new Date()) {
	const row = await prisma.representationDelegation.findUnique({
		where: { id },
		include: delegationInclude
	});
	if (!row) return null;
	const artist = (await artistAnswerers(prisma, row.representation.artistId, now)).includes(
		personId
	);
	if (row.delegateId !== personId && row.representation.agentId !== personId && !artist)
		return null;
	const active = await delegationBaseActive(prisma, row, now);
	const effective = active && delegationAllows(row, 'VIEW_MANDATE', now);
	const canViewTerms = personId === row.representation.agentId || artist || effective;
	return {
		id: row.id,
		representationId: row.representationId,
		activity: delegationTimeline(row),
		agencyId: row.agencyId,
		agencyName: row.agency.actor.displayName,
		artistName: row.representation.artist.displayName,
		agentName: row.representation.agent.displayName,
		delegateName: row.delegate.displayName,
		kind: row.representation.kind,
		canViewTerms,
		startsAt: canViewTerms ? row.representation.startsAt : null,
		expiresAt: row.expiresAt ?? row.representation.expiresAt,
		departmentCodes: canViewTerms ? row.representation.departmentCodes : [],
		allowedActions: canViewTerms ? row.representation.allowedActions : [],
		actions: row.actions,
		acceptedAt: row.acceptedAt,
		approvedAt: row.approvedAt,
		approvedBy: row.approvedBy?.displayName ?? null,
		endedAt: row.endedAt,
		endedBy: row.endedBy?.displayName ?? null,
		createdAt: row.createdAt,
		active,
		effective,
		canAccept: personId === row.delegateId && !row.acceptedAt && active,
		canApprove: artist && !row.approvedAt && active,
		canRevoke: !row.endedAt,
		canEnd: personId === row.delegateId && effective && row.actions.includes('END_MANDATE')
	};
}
export async function myDelegations(personId: string, agencyId?: string) {
	// La liste reste une projection légère ; seule la fiche et le service métier évaluent les droits.
	const viewer = await prisma.actor.findFirst({
		where: { id: personId, deletedAt: null },
		select: { person: { select: { birthDate: true } } }
	});
	if (!isIndexable(viewer?.person?.birthDate)) return [];
	const bands = await prisma.membership.findMany({
		where: {
			personId,
			status: 'ACTIVE',
			role: { in: ['OWNER', 'ADMIN'] },
			org: { kind: 'BAND', dissolvedAt: null, actor: { deletedAt: null } }
		},
		select: { orgId: true }
	});
	const rows = await prisma.representationDelegation.findMany({
		where: {
			...(agencyId ? { agencyId } : {}),
			OR: [
				{ delegateId: personId },
				{ representation: { agentId: personId } },
				{ representation: { artistId: { in: [personId, ...bands.map((b) => b.orgId)] } } }
			]
		},
		orderBy: { createdAt: 'desc' },
		take: 100,
		select: {
			id: true,
			endedAt: true,
			acceptedAt: true,
			approvedAt: true,
			delegate: { select: { displayName: true } },
			agency: { select: { actor: { select: { displayName: true } } } },
			representation: { select: { artist: { select: { displayName: true } } } }
		}
	});
	return rows.map((row) => ({
		id: row.id,
		artistName: row.representation.artist.displayName,
		agencyName: row.agency.actor.displayName,
		delegateName: row.delegate.displayName,
		endedAt: row.endedAt,
		acceptedAt: row.acceptedAt,
		approvedAt: row.approvedAt
	}));
}

/** Consumer réel : le service métier revérifie le mandat au moment d’écrire. */
export async function endDelegatedRepresentation(id: string, byId: string, now = new Date()) {
	const row = await delegationForMe(id, byId, now);
	if (!row?.canEnd)
		throw new RepresentationError('Aucun droit actif pour terminer cet accompagnement.', 403);
	await endRepresentation(row.representationId, byId, now);
}
