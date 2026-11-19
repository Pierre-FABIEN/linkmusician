/**
 * Gestion d'un projet (P2, D72 I7) : celle de son porteur, relue à chaque
 * écriture et jamais stockée. La personne elle-même, ou une adhésion ACTIVE
 * OWNER/ADMIN d'une organisation vivante admise (BAND, PROMOTER, STUDIO,
 * VENUE). Un simple membre ne gère pas le projet de son groupe (I2).
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { structureAccess } from '#lib/server/organizations/access';
import { isAllowedOwner, PROJECT_OWNER_ORG_KINDS } from '#lib/projects/rules';
import { isIndexable } from '#lib/actors/visibility';
import {
	effectiveCapabilities,
	OPEN_PARTICIPANT_STATUSES,
	projectRole,
	type ParticipantStatusValue,
	type ProjectCapabilityValue,
	type ProjectRoleValue
} from '#lib/projects/participants';

type Db = Prisma.TransactionClient | typeof prisma;

/** Porteurs que la personne gère : prédicat des lectures (fiche, listes). */
export function projectManagerWhere(personId: string): Prisma.ActorWhereInput {
	return {
		deletedAt: null,
		OR: [
			{ id: personId, kind: 'PERSON' },
			{
				kind: 'ORGANIZATION',
				organization: {
					kind: { in: [...PROJECT_OWNER_ORG_KINDS] },
					dissolvedAt: null,
					memberships: {
						some: { personId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } }
					}
				}
			}
		]
	};
}

export type ProjectOwnerHead = {
	id: string;
	kind: 'PERSON' | 'ORGANIZATION';
	deletedAt: Date | null;
	organization: { kind: string; dissolvedAt: Date | null } | null;
};

export const ownerHeadSelect = {
	id: true,
	kind: true,
	deletedAt: true,
	organization: { select: { kind: true, dissolvedAt: true } }
} as const;

/** Verrou sous lequel la gouvernance du porteur change : `band:` pour un
 * groupe (bands/service), `studio:` pour un studio, `org:` pour un lieu ou
 * une organisation (comanagement). Aucun pour une personne. */
export function ownerLockKey(owner: ProjectOwnerHead): string | null {
	if (owner.kind !== 'ORGANIZATION') return null;
	switch (owner.organization?.kind) {
		case 'BAND':
			return `band:${owner.id}`;
		case 'STUDIO':
			return `studio:${owner.id}`;
		default:
			return `org:${owner.id}`;
	}
}

/** Point de décision des écritures, à appeler sous le verrou du porteur. */
export async function managesOwner(db: Db, owner: ProjectOwnerHead, personId: string) {
	if (owner.deletedAt || !isAllowedOwner(owner.kind, owner.organization?.kind)) return false;
	if (owner.kind === 'PERSON') return owner.id === personId;
	const access = await structureAccess(db, owner.id, personId);
	return !!access && access.permissions.includes('manage');
}

/** Moi, puis les structures admises que je gère : choix du porteur. */
export async function manageableProjectOwners(personId: string) {
	const actors = await prisma.actor.findMany({
		where: projectManagerWhere(personId),
		select: { id: true, kind: true, displayName: true, organization: { select: { kind: true } } },
		orderBy: { displayName: 'asc' }
	});
	return actors
		.map((a) => ({
			id: a.id,
			name: a.displayName,
			isMe: a.id === personId,
			orgKind: a.organization?.kind ?? null
		}))
		.sort((a, b) => Number(b.isMe) - Number(a.isMe));
}

// ─── P4a : participation et capacités (conception 19 §6.2, §9.1) ─────────

/** Le porteur peut encore agir : vivant, admis, organisation non dissoute.
 * Sinon le projet est en lecture seule pour ses participant·es (§6.5). */
export function ownerLive(owner: ProjectOwnerHead): boolean {
	return (
		!owner.deletedAt &&
		isAllowedOwner(owner.kind, owner.organization?.kind) &&
		!owner.organization?.dissolvedAt
	);
}

/** Projets qu'une personne peut lire : gestion du porteur, ou participation
 * active (sans héritage : un simple membre du groupe ne lit rien, I2). */
export function projectReaderWhere(personId: string): Prisma.ProjectWhereInput {
	return {
		OR: [
			{ owner: projectManagerWhere(personId) },
			{ participants: { some: { personId, status: 'ACTIVE' } } }
		]
	};
}

export type ProjectAccess = {
	manage: boolean;
	/** Participation ouverte (invitée ou active) de la personne, s'il y en a une. */
	participation: {
		id: string;
		status: ParticipantStatusValue;
		role: string | null;
		capabilities: ProjectCapabilityValue[];
		proposedCapabilities: ProjectCapabilityValue[];
		asMember: boolean;
	} | null;
	/** Capacités en vigueur, relues (§6.3, D46) ; aucune si le porteur ne peut plus agir. */
	capabilities: ProjectCapabilityValue[];
	coordinate: boolean;
	/** Lit la fiche : gestion ou participation active. */
	reader: boolean;
	minor: boolean;
	role: ProjectRoleValue | null;
};

/**
 * Prédicat unique (§9.1) : gestion, participation et capacités d'une
 * personne dans un projet. Dans une écriture, à appeler **sous** `project:`
 * puis le verrou du porteur : une révocation ou un départ du groupe prend
 * l'un de ces verrous, et l'écriture voit donc l'état d'après (I12).
 */
export async function projectAccess(
	db: Db,
	project: { id: string; owner: ProjectOwnerHead },
	personId: string,
	now = new Date()
): Promise<ProjectAccess> {
	const [manage, row] = await Promise.all([
		managesOwner(db, project.owner, personId),
		db.projectParticipant.findFirst({
			where: { projectId: project.id, personId, status: { in: ['INVITED', 'ACTIVE'] } },
			select: {
				id: true,
				status: true,
				role: true,
				capabilities: true,
				proposedCapabilities: true,
				asMember: true,
				person: { select: { person: { select: { birthDate: true } } } }
			}
		})
	]);
	const minor = row ? !isIndexable(row.person.person?.birthDate, now) : false;
	const memberNow =
		!!row?.asMember &&
		project.owner.kind === 'ORGANIZATION' &&
		(await db.membership.count({
			where: { orgId: project.owner.id, personId, status: 'ACTIVE' }
		})) > 0;
	const capabilities =
		row && ownerLive(project.owner)
			? effectiveCapabilities({
					status: row.status,
					capabilities: row.capabilities,
					asMember: row.asMember,
					memberNow,
					minor
				})
			: [];
	const participant = row?.status === 'ACTIVE';
	return {
		manage,
		participation: row
			? {
					id: row.id,
					status: row.status,
					role: row.role,
					capabilities: row.capabilities,
					proposedCapabilities: row.proposedCapabilities,
					asMember: row.asMember
				}
			: null,
		capabilities,
		coordinate: capabilities.includes('COORDINATE'),
		reader: manage || participant,
		minor,
		role: projectRole({ manage, capabilities, participant })
	};
}

/** Ce qu'il faut sélectionner sur un projet pour calculer, sans autre
 * requête, l'accès de lecture d'une personne (fiche, « Mes projets »). */
export function readerAccessSelect(personId: string) {
	return {
		ownerId: true,
		owner: {
			select: {
				...ownerHeadSelect,
				organization: {
					select: {
						kind: true,
						dissolvedAt: true,
						memberships: {
							where: { personId, status: 'ACTIVE' },
							select: { role: true },
							take: 1
						}
					}
				}
			}
		},
		participants: {
			where: { personId, status: { in: [...OPEN_PARTICIPANT_STATUSES] } },
			select: {
				id: true,
				status: true,
				role: true,
				capabilities: true,
				proposedCapabilities: true,
				asMember: true,
				person: { select: { person: { select: { birthDate: true } } } }
			},
			take: 1
		}
	} satisfies Prisma.ProjectSelect;
}

type ReaderRow = {
	ownerId: string;
	owner: ProjectOwnerHead & {
		organization: {
			kind: string;
			dissolvedAt: Date | null;
			memberships: { role: string }[];
		} | null;
	};
	participants: {
		id: string;
		status: ParticipantStatusValue;
		role: string | null;
		capabilities: ProjectCapabilityValue[];
		proposedCapabilities: ProjectCapabilityValue[];
		asMember: boolean;
		person: { person: { birthDate: Date | null } | null };
	}[];
};

/**
 * Mêmes règles que `projectAccess`, à partir de `readerAccessSelect` : pour
 * les **lectures** seulement (aucun verrou). Toute écriture relit par
 * `projectAccess` sous `project:`.
 */
export function readerAccess(row: ReaderRow, personId: string, now = new Date()): ProjectAccess {
	const owner = row.owner;
	const live = ownerLive(owner);
	const membership = owner.organization?.memberships[0];
	const manage =
		live &&
		(owner.kind === 'PERSON'
			? row.ownerId === personId
			: membership?.role === 'OWNER' || membership?.role === 'ADMIN');
	const p = row.participants[0] ?? null;
	const minor = p ? !isIndexable(p.person.person?.birthDate, now) : false;
	const capabilities =
		p && live
			? effectiveCapabilities({
					status: p.status,
					capabilities: p.capabilities,
					asMember: p.asMember,
					memberNow: !!membership,
					minor
				})
			: [];
	const participant = p?.status === 'ACTIVE';
	return {
		manage,
		participation: p
			? {
					id: p.id,
					status: p.status,
					role: p.role,
					capabilities: p.capabilities,
					proposedCapabilities: p.proposedCapabilities,
					asMember: p.asMember
				}
			: null,
		capabilities,
		coordinate: capabilities.includes('COORDINATE'),
		reader: manage || participant,
		minor,
		role: projectRole({ manage, capabilities, participant })
	};
}
