/**
 * Participant·es d'un projet (P4a, D72 révision 2), seul point d'écriture
 * de `ProjectParticipant`. Conception 19 §6.2 (matrice), §6.3 et §6.5
 * (révocation, départ), §6.7 (verrous), §9.1 (capacités), §9.3 (ce que voit
 * une personne invitée).
 *
 * - L'identité vient de la session ; aucune capacité envoyée par le client
 *   n'est crue : la gestion **propose**, la personne **accepte**, et tout est
 *   relu sous `project:` puis le verrou du porteur (I7, I11, I12).
 * - Retirer une participation ou une capacité prend les mêmes verrous que
 *   les écritures qui s'appuient dessus : les deux sont sérialisées (I12).
 * - Un projet clos gèle la participation : ni invitation, ni acceptation, ni
 *   capacité nouvelle. Quitter, retirer et révoquer restent possibles (une
 *   protection l'emporte toujours, comme l'abaissement d'un partage).
 * - Rien ici n'émet d'événement de progression, ne crée de crédit ni ne
 *   change une adhésion (I2, I3, I9).
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { isIndexable } from '#lib/actors/visibility';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { notify } from '#lib/server/notifications/service';
import {
	capabilitiesToPropose,
	declinedRecently,
	inviteRefusal,
	MAX_OPEN_PARTICIPANTS,
	MAX_PENDING_PROJECT_INVITES,
	type ProjectCapabilityValue
} from '#lib/projects/participants';
import { managesOwner, ownerLive, projectAccess } from './access';
import {
	act,
	CLOSED,
	lockProjectContext,
	MANAGERS_ONLY,
	PROJECT_NOT_FOUND,
	ProjectError,
	type LockedProject
} from './service';

type Tx = Prisma.TransactionClient;
const TX = { timeout: 15_000 } as const;

const notFound = () => new ProjectError(PROJECT_NOT_FOUND, 404);
const managersOnly = () => new ProjectError(MANAGERS_ONLY, 403);
const INVITE_GONE = 'Cette invitation n’existe plus.';
const PARTICIPANT_GONE = 'Cette personne ne participe plus au projet.';
const FROZEN = 'Ce projet ne peut plus changer d’équipe pour l’instant.';

/** Un projet dont le porteur ne peut plus agir (groupe dissous) est en
 * lecture seule, comme un projet clos. */
function assertOpen(project: LockedProject) {
	if (project.status !== 'ACTIVE') throw new ProjectError(CLOSED, 409);
	if (!ownerLive(project.owner)) throw new ProjectError(FROZEN, 409);
}

/** La personne est membre active de l'organisation porteuse (lue sous le
 * verrou du porteur). */
async function memberOfOwner(tx: Tx, project: LockedProject, personId: string) {
	if (project.owner.kind !== 'ORGANIZATION') return false;
	return (
		(await tx.membership.count({
			where: { orgId: project.owner.id, personId, status: 'ACTIVE' }
		})) > 0
	);
}

export type InviteInput = { handle: string; role: string | null; coordinate: boolean };

/**
 * Inviter une personne par son @handle (§6.2) : la gestion propose une
 * participation simple ou la coordination ; la coordination invite des
 * participant·es simples. Blocages dans les deux sens, mineur·es (D37, D46,
 * Q-G0-12) et quotas (Q79) ; la raison d'un refus n'est jamais dite.
 */
export async function inviteParticipant(
	inviterId: string,
	projectId: string,
	input: InviteInput,
	now = new Date()
) {
	const invitee = await prisma.actor.findFirst({
		where: { handle: input.handle, person: { isNot: null }, ...publicActorWhere(now, inviterId) },
		select: { id: true, displayName: true, person: { select: { birthDate: true } } }
	});
	if (!invitee) throw new ProjectError('Aucun·e musicien·ne avec cet identifiant.', 404);
	if (invitee.id === inviterId) throw new ProjectError('Tu fais déjà partie de ce projet.', 400);
	const unreachable = new ProjectError(
		`${invitee.displayName} ne peut pas recevoir d’invitation pour l’instant.`,
		400
	);
	if (await isBlockedBetween(inviterId, invitee.id)) throw unreachable;
	const capabilities: ProjectCapabilityValue[] = input.coordinate ? ['COORDINATE'] : [];
	const minor = !isIndexable(invitee.person?.birthDate, now);

	await prisma.$transaction(async (tx) => {
		const project = await lockProjectContext(tx, projectId);
		const access = await projectAccess(tx, project, inviterId, now);
		if (!access.manage && !access.coordinate) throw access.reader ? managersOnly() : notFound();
		assertOpen(project);
		const minorIsMember =
			minor &&
			project.owner.organization?.kind === 'BAND' &&
			(await memberOfOwner(tx, project, invitee.id));
		const refusal = inviteRefusal({
			manage: access.manage,
			capabilities,
			minor,
			minorIsMemberOfOwnerBand: minorIsMember
		});
		if (refusal === 'capabilities') {
			throw new ProjectError('Seule la gestion du projet propose la coordination.', 403);
		}
		if (refusal) throw unreachable;
		if (await managesOwner(tx, project.owner, invitee.id)) {
			throw new ProjectError(`${invitee.displayName} gère déjà ce projet.`, 409);
		}
		const [existing, lastDecline, pending, open] = await Promise.all([
			tx.projectParticipant.findFirst({
				where: { projectId, personId: invitee.id, status: { in: ['INVITED', 'ACTIVE'] } },
				select: { status: true }
			}),
			tx.projectParticipant.findFirst({
				where: { projectId, personId: invitee.id, status: 'DECLINED' },
				orderBy: { answeredAt: 'desc' },
				select: { answeredAt: true }
			}),
			tx.projectParticipant.count({ where: { projectId, status: 'INVITED' } }),
			tx.projectParticipant.count({ where: { projectId, status: { in: ['INVITED', 'ACTIVE'] } } })
		]);
		if (existing?.status === 'ACTIVE') {
			throw new ProjectError(`${invitee.displayName} participe déjà au projet.`, 409);
		}
		if (existing?.status === 'INVITED') {
			throw new ProjectError(`${invitee.displayName} a déjà une invitation en attente.`, 409);
		}
		if (declinedRecently(lastDecline?.answeredAt ?? null, now)) throw unreachable;
		if (pending >= MAX_PENDING_PROJECT_INVITES) {
			throw new ProjectError(
				`Ce projet a déjà ${MAX_PENDING_PROJECT_INVITES} invitations en attente : attends des réponses.`,
				409
			);
		}
		if (open >= MAX_OPEN_PARTICIPANTS) {
			throw new ProjectError(
				`${MAX_OPEN_PARTICIPANTS} participant·es au plus dans un projet.`,
				409
			);
		}
		await tx.projectParticipant.create({
			data: {
				projectId,
				personId: invitee.id,
				status: 'INVITED',
				role: input.role,
				proposedCapabilities: capabilities,
				invitedById: inviterId,
				invitedAt: now
			}
		});
		await act(tx, {
			projectId,
			authorId: inviterId,
			kind: 'INVITED',
			subjectId: invitee.id,
			capability: capabilities[0]
		});
		// §9.3 : le minimum (qui invite, le nom du projet) ; le reste se lit à
		// l'ouverture, droits réévalués.
		await notify(tx, {
			recipientId: invitee.id,
			type: 'PROJECT_INVITE',
			fromActorId: inviterId,
			href: '/projets#invitations',
			title: project.name
		});
	}, TX);
	return invitee;
}

/** Ligne ouverte de la personne dans le projet, relue sous verrou. */
async function myOpenRow(tx: Tx, projectId: string, personId: string) {
	return tx.projectParticipant.findFirst({
		where: { projectId, personId, status: { in: ['INVITED', 'ACTIVE'] } },
		select: {
			id: true,
			status: true,
			capabilities: true,
			proposedCapabilities: true,
			invitedById: true
		}
	});
}

/** Accepter ou refuser son invitation (la personne elle-même). Accepter
 * vaut consentement aux capacités proposées (§9.1). */
export async function answerInvitation(
	personId: string,
	participantId: string,
	accept: boolean,
	now = new Date()
) {
	const head = await prisma.projectParticipant.findFirst({
		where: { id: participantId, personId },
		select: { projectId: true }
	});
	if (!head) throw new ProjectError(INVITE_GONE, 404);
	return prisma.$transaction(async (tx) => {
		const project = await lockProjectContext(tx, head.projectId);
		const row = await myOpenRow(tx, project.id, personId);
		if (!row || row.id !== participantId || row.status !== 'INVITED') {
			throw new ProjectError(INVITE_GONE, 404);
		}
		if (!accept) {
			await tx.projectParticipant.update({
				where: { id: row.id },
				data: { status: 'DECLINED', answeredAt: now, endedAt: now, proposedCapabilities: [] }
			});
			await act(tx, {
				projectId: project.id,
				authorId: personId,
				kind: 'DECLINED',
				subjectId: personId
			});
			return { projectId: project.id, joined: false };
		}
		assertOpen(project);
		const access = await projectAccess(tx, project, personId, now);
		const memberNow = await memberOfOwner(tx, project, personId);
		// Une ou un mineur·e : seulement dans un projet de son groupe, sans capacité.
		if (access.minor && !(project.owner.organization?.kind === 'BAND' && memberNow)) {
			throw new ProjectError(INVITE_GONE, 404);
		}
		const capabilities = access.minor ? [] : row.proposedCapabilities;
		await tx.projectParticipant.update({
			where: { id: row.id },
			data: {
				status: 'ACTIVE',
				answeredAt: now,
				capabilities,
				proposedCapabilities: [],
				asMember: capabilities.length > 0 && memberNow
			}
		});
		await act(tx, {
			projectId: project.id,
			authorId: personId,
			kind: 'JOINED',
			subjectId: personId
		});
		for (const capability of capabilities) {
			await act(tx, {
				projectId: project.id,
				authorId: personId,
				kind: 'CAPABILITY_GRANTED',
				subjectId: personId,
				capability
			});
		}
		if (row.invitedById) {
			await notify(tx, {
				recipientId: row.invitedById,
				type: 'PROJECT_JOINED',
				fromActorId: personId,
				href: `/projets/${project.id}`,
				title: project.name
			});
		}
		return { projectId: project.id, joined: true };
	}, TX);
}

/** Quitter un projet (la personne elle-même), même clos. Ses capacités
 * tombent avec la participation. */
export async function leaveProject(personId: string, projectId: string, now = new Date()) {
	await prisma.$transaction(async (tx) => {
		const project = await lockProjectContext(tx, projectId);
		const row = await myOpenRow(tx, project.id, personId);
		if (!row || row.status !== 'ACTIVE') throw notFound();
		await tx.projectParticipant.update({
			where: { id: row.id },
			data: { status: 'LEFT', endedAt: now, capabilities: [], proposedCapabilities: [] }
		});
		await act(tx, { projectId, authorId: personId, kind: 'LEFT', subjectId: personId });
	}, TX);
}

/** Ligne ouverte d'un·e participant·e de ce projet (jamais d'un autre :
 * identifiants forgés), après contrôle de la gestion. */
async function managedRow(tx: Tx, projectId: string, participantId: string, managerId: string) {
	const project = await lockProjectContext(tx, projectId);
	const access = await projectAccess(tx, project, managerId);
	if (!access.manage) throw access.reader ? managersOnly() : notFound();
	const row = await tx.projectParticipant.findFirst({
		where: { id: participantId, projectId, status: { in: ['INVITED', 'ACTIVE'] } },
		select: {
			id: true,
			personId: true,
			status: true,
			capabilities: true,
			proposedCapabilities: true,
			person: { select: { person: { select: { birthDate: true } } } }
		}
	});
	if (!row) throw new ProjectError(PARTICIPANT_GONE, 404);
	return { project, row };
}

/** Retirer un·e participant·e ou une invitation (gestion seule), même sur un
 * projet clos : effet à l'écriture et à la lecture suivantes (I12). */
export async function removeParticipant(
	managerId: string,
	projectId: string,
	participantId: string,
	now = new Date()
) {
	await prisma.$transaction(async (tx) => {
		const { row } = await managedRow(tx, projectId, participantId, managerId);
		await tx.projectParticipant.update({
			where: { id: row.id },
			data: { status: 'REMOVED', endedAt: now, capabilities: [], proposedCapabilities: [] }
		});
		await act(tx, { projectId, authorId: managerId, kind: 'REMOVED', subjectId: row.personId });
	}, TX);
}

/** Proposer une capacité (gestion seule, I11) : elle ne vaut qu'après
 * acceptation de la personne (§9.1). Jamais à un·e mineur·e. */
export async function proposeCapability(
	managerId: string,
	projectId: string,
	participantId: string,
	capability: ProjectCapabilityValue,
	now = new Date()
) {
	await prisma.$transaction(async (tx) => {
		const { project, row } = await managedRow(tx, projectId, participantId, managerId);
		assertOpen(project);
		if (row.status !== 'ACTIVE') throw new ProjectError(PARTICIPANT_GONE, 404);
		if (!isIndexable(row.person.person?.birthDate, now)) {
			throw new ProjectError('Cette personne ne peut pas recevoir la coordination.', 409);
		}
		const added = capabilitiesToPropose([capability], row.capabilities, row.proposedCapabilities);
		if (added.length === 0) throw new ProjectError('C’est déjà proposé ou accordé.', 409);
		await tx.projectParticipant.update({
			where: { id: row.id },
			data: { proposedCapabilities: [...row.proposedCapabilities, ...added] }
		});
	}, TX);
}

/** Accepter ou refuser une capacité proposée (la personne elle-même). */
export async function answerCapability(
	personId: string,
	projectId: string,
	accept: boolean,
	now = new Date()
) {
	await prisma.$transaction(async (tx) => {
		const project = await lockProjectContext(tx, projectId);
		const row = await myOpenRow(tx, project.id, personId);
		if (!row || row.status !== 'ACTIVE') throw notFound();
		if (row.proposedCapabilities.length === 0) {
			throw new ProjectError('Aucune proposition en attente.', 404);
		}
		if (!accept) {
			await tx.projectParticipant.update({
				where: { id: row.id },
				data: { proposedCapabilities: [] }
			});
			return;
		}
		assertOpen(project);
		const access = await projectAccess(tx, project, personId, now);
		if (access.minor) throw new ProjectError('Aucune proposition en attente.', 404);
		const added = row.proposedCapabilities.filter((c) => !row.capabilities.includes(c));
		await tx.projectParticipant.update({
			where: { id: row.id },
			data: {
				capabilities: [...row.capabilities, ...added],
				proposedCapabilities: [],
				asMember: await memberOfOwner(tx, project, personId)
			}
		});
		for (const capability of added) {
			await act(tx, {
				projectId,
				authorId: personId,
				kind: 'CAPABILITY_GRANTED',
				subjectId: personId,
				capability
			});
		}
	}, TX);
}

/** Retirer une capacité, en vigueur ou proposée (gestion seule, sans
 * acceptation), même sur un projet clos. */
export async function revokeCapability(
	managerId: string,
	projectId: string,
	participantId: string,
	capability: ProjectCapabilityValue
) {
	await prisma.$transaction(async (tx) => {
		const { row } = await managedRow(tx, projectId, participantId, managerId);
		const held = row.capabilities.includes(capability);
		if (!held && !row.proposedCapabilities.includes(capability)) {
			throw new ProjectError('Cette personne n’a pas cette capacité.', 409);
		}
		await tx.projectParticipant.update({
			where: { id: row.id },
			data: {
				capabilities: row.capabilities.filter((c) => c !== capability),
				proposedCapabilities: row.proposedCapabilities.filter((c) => c !== capability)
			}
		});
		await act(tx, {
			projectId,
			authorId: managerId,
			kind: 'CAPABILITY_REVOKED',
			subjectId: row.personId,
			capability
		});
	}, TX);
}

/**
 * Départ de l'organisation porteuse (§6.3, §6.5) : les capacités reçues
 * comme membre tombent, avec un acte `CAPABILITY_REVOKED` par projet. La
 * participation reste. À appeler **après** la transaction du départ (elle
 * tient `band:`, qui se prend après `project:`) : entre les deux,
 * `projectAccess` ne compte déjà plus ces capacités.
 */
export async function dropMemberCapabilities(orgId: string, personId: string, authorId: string) {
	const rows = await prisma.projectParticipant.findMany({
		where: {
			personId,
			status: 'ACTIVE',
			asMember: true,
			project: { ownerId: orgId }
		},
		select: { projectId: true }
	});
	for (const { projectId } of rows) {
		await prisma.$transaction(async (tx) => {
			const project = await lockProjectContext(tx, projectId);
			if (await memberOfOwner(tx, project, personId)) return;
			const row = await tx.projectParticipant.findFirst({
				where: { projectId, personId, status: 'ACTIVE', asMember: true },
				select: { id: true, capabilities: true }
			});
			if (!row) return;
			await tx.projectParticipant.update({
				where: { id: row.id },
				data: { capabilities: [], proposedCapabilities: [], asMember: false }
			});
			for (const capability of row.capabilities) {
				await act(tx, {
					projectId,
					authorId,
					kind: 'CAPABILITY_REVOKED',
					subjectId: personId,
					capability
				});
			}
		}, TX);
	}
}

/**
 * Mes invitations en attente (§9.3) : nom et type du projet, porteur, qui
 * invite, capacités proposées ; rien des éléments, de l'équipe ni de la
 * description. Une invitation d'une personne bloquée (dans un sens ou
 * dans l'autre) n'est pas montrée.
 */
export async function myInvitations(personId: string) {
	const rows = await prisma.projectParticipant.findMany({
		where: {
			personId,
			status: 'INVITED',
			project: { status: 'ACTIVE', owner: { deletedAt: null } }
		},
		orderBy: [{ invitedAt: 'desc' }, { id: 'asc' }],
		take: 50,
		select: {
			id: true,
			role: true,
			proposedCapabilities: true,
			invitedAt: true,
			project: {
				select: {
					name: true,
					kind: true,
					owner: { select: { displayName: true, organization: { select: { dissolvedAt: true } } } }
				}
			},
			invitedBy: {
				select: {
					id: true,
					displayName: true,
					deletedAt: true,
					blocksMade: {
						where: { blockedActorId: personId },
						select: { blockerActorId: true },
						take: 1
					},
					blocksReceived: {
						where: { blockerActorId: personId },
						select: { blockedActorId: true },
						take: 1
					}
				}
			}
		}
	});
	return rows
		.filter(
			(r) =>
				!r.project.owner.organization?.dissolvedAt &&
				!(
					r.invitedBy &&
					(r.invitedBy.blocksMade.length > 0 || r.invitedBy.blocksReceived.length > 0)
				)
		)
		.map((r) => ({
			id: r.id,
			projectName: r.project.name,
			kind: r.project.kind,
			owner: r.project.owner.displayName,
			invitedBy: r.invitedBy && !r.invitedBy.deletedAt ? r.invitedBy.displayName : null,
			role: r.role,
			capabilities: r.proposedCapabilities,
			invitedAt: r.invitedAt
		}));
}
