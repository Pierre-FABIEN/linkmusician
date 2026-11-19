/**
 * Projets (P2, D72 révision 2), seul point d'écriture de `Project`,
 * `ProjectItem` et `ProjectAct`. Conception 19 §6.2 (matrice), §6.7
 * (verrous) et §9.3 (partage).
 *
 * - L'identité vient de la session (`personId`) ; aucun identifiant envoyé
 *   par le client (porteur, morceau, élément) ne prouve un droit : tout est
 *   relu en transaction, sous verrou, à chaque écriture (I7, I12).
 * - Ordre des verrous : `project-owner:` (quota du porteur) → `project:` →
 *   `work:` → `band:` / `studio:` / `org:` (triés). Il prolonge ARCH-MET-02a ;
 *   aucune écriture de projet ne prend `collaboration:` en P2.
 * - P4a : la coordination (capacité `COORDINATE`, relue par `projectAccess`
 *   sous ces mêmes verrous) change dates et phrase, range ses morceaux et
 *   retire ce qu'elle a rangé ; rien d'autre (I11). Une personne qui lit le
 *   projet sans le gérer reçoit 403 ; les autres, 404.
 * - Rien ici n'émet d'événement de progression, ne crée de crédit, ne
 *   corrobore ni ne change un porteur (I1, I3, I9).
 * - Un projet inaccessible répond comme un projet inexistant (404).
 */
import type { Prisma, ProjectCapability, ProjectShare, ProjectStatus } from '@prisma/client';
import { prisma } from '#lib/server';
import { lockWork } from '#lib/server/works/service';
import { manageableOwnerWhere } from '#lib/server/works/access';
import {
	canChangeShare,
	canTransition,
	defaultShare,
	isAllowedOwner,
	itemsQuotaReached,
	MAX_ACTIVE_PROJECTS,
	projectQuota,
	QUOTA_MESSAGES
} from '#lib/projects/rules';
import type {
	AddItemInput,
	EditProjectInput,
	ItemShareInput,
	NewProjectInput
} from '#lib/schema/projects/project';
import {
	managesOwner,
	ownerHeadSelect,
	ownerLockKey,
	projectAccess,
	type ProjectOwnerHead
} from './access';

export class ProjectError extends Error {
	constructor(
		message: string,
		readonly status = 400,
		/** U3 : un quota atteint arrête une série d'invitations. */
		readonly code?: 'quota'
	) {
		super(message);
	}
}

type Tx = Prisma.TransactionClient;
const TX = { timeout: 15_000 } as const;

export const PROJECT_NOT_FOUND = 'Ce projet n’existe pas, ou tu n’y as pas accès.';
const notFound = () => new ProjectError(PROJECT_NOT_FOUND, 404);
const WORK_NOT_MINE = 'Tu ne peux ranger ici que des morceaux que tu gères.';
const ITEM_NOT_FOUND = 'Cet élément n’est plus dans le projet.';
export const CLOSED = 'Ce projet est clos : rouvre-le pour le modifier.';
export const MANAGERS_ONLY = 'Seule la gestion du projet peut faire cela.';
const managersOnly = () => new ProjectError(MANAGERS_ONLY, 403);

async function lockKey(tx: Tx, key: string) {
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

export async function lockProject(tx: Tx, projectId: string) {
	await lockKey(tx, `project:${projectId}`);
}

/** Verrous des porteurs (projet, morceau), dédoublonnés et triés : deux
 * rangements croisés entre deux groupes ne s'attendent pas mutuellement. */
async function lockOwners(tx: Tx, keys: (string | null)[]) {
	const unique = [...new Set(keys.filter((k): k is string => !!k))].sort();
	for (const key of unique) await lockKey(tx, key);
}

const projectHead = {
	id: true,
	name: true,
	ownerId: true,
	status: true,
	owner: { select: ownerHeadSelect }
} as const;

async function loadProject(tx: Tx, projectId: string) {
	return tx.project.findUnique({ where: { id: projectId }, select: projectHead });
}

const workHead = {
	id: true,
	state: true,
	ownerId: true,
	owner: { select: ownerHeadSelect }
} as const;
type WorkHead = { ownerId: string; owner: ProjectOwnerHead };

const workOwnerKey = (w: WorkHead | null) =>
	w && w.owner.kind === 'ORGANIZATION' ? `band:${w.ownerId}` : null;

/** Gestion du morceau (porteur personnel vivant, ou gestion d'un groupe
 * vivant) : même prédicat que `loadManagedWork`, relu sous `work:` → `band:`. */
async function managesWork(tx: Tx, work: WorkHead | null, personId: string) {
	if (!work) return false;
	return (
		(await tx.actor.count({ where: { id: work.ownerId, ...manageableOwnerWhere(personId) } })) > 0
	);
}

/** Projet relu sous `project:` puis le verrou de son porteur (P4a : toute
 * écriture qui s'appuie sur une participation ou une capacité). */
export async function lockProjectContext(tx: Tx, projectId: string) {
	await lockProject(tx, projectId);
	const project = await loadProject(tx, projectId);
	if (!project) throw notFound();
	await lockOwners(tx, [ownerLockKey(project.owner)]);
	return project;
}
export type LockedProject = Awaited<ReturnType<typeof lockProjectContext>>;

/** Projet géré, relu sous `project:` puis le verrou du porteur. Une personne
 * qui le lit sans le gérer : 403 ; sinon 404. */
async function loadManagedProject(tx: Tx, projectId: string, personId: string) {
	const project = await lockProjectContext(tx, projectId);
	const access = await projectAccess(tx, project, personId);
	if (!access.manage) throw access.reader ? managersOnly() : notFound();
	return project;
}

export async function act(
	tx: Tx,
	data: {
		projectId: string;
		authorId: string;
		kind: Prisma.ProjectActCreateManyInput['kind'];
		workId?: string;
		fromShare?: ProjectShare;
		toShare?: ProjectShare;
		fromStatus?: ProjectStatus;
		toStatus?: ProjectStatus;
		subjectId?: string;
		capability?: ProjectCapability;
		/** U3b : besoin concerné. */
		needId?: string;
	}
) {
	await tx.projectAct.create({ data });
}

async function ownerCounts(tx: Tx, ownerId: string) {
	const [active, total] = await Promise.all([
		tx.project.count({ where: { ownerId, status: 'ACTIVE' } }),
		tx.project.count({ where: { ownerId } })
	]);
	return { active, total };
}

const OWNER_REFUSED = 'Un projet se porte en ton nom, ou pour une structure que tu gères.';

/** Créer un projet (matrice : gestion du porteur). Aucun élément, aucune
 * personne, aucun gain : un acte `CREATED`. */
export async function createProject(personId: string, input: NewProjectInput) {
	const ownerId = input.owner ?? personId;
	return prisma.$transaction(async (tx) => {
		await lockKey(tx, `project-owner:${ownerId}`);
		const owner = await tx.actor.findUnique({ where: { id: ownerId }, select: ownerHeadSelect });
		if (!owner || !isAllowedOwner(owner.kind, owner.organization?.kind)) {
			throw new ProjectError(OWNER_REFUSED, 403);
		}
		await lockOwners(tx, [ownerLockKey(owner)]);
		if (!(await managesOwner(tx, owner, personId))) throw new ProjectError(OWNER_REFUSED, 403);
		const refusal = projectQuota(await ownerCounts(tx, ownerId));
		if (refusal) throw new ProjectError(QUOTA_MESSAGES[refusal], 409);
		const project = await tx.project.create({
			data: {
				ownerId,
				name: input.name,
				kind: input.kind,
				description: input.description,
				startsOn: input.startsOn,
				dueOn: input.dueOn
			},
			select: { id: true }
		});
		await act(tx, { projectId: project.id, authorId: personId, kind: 'CREATED' });
		return project;
	}, TX);
}

/** Nom, type, phrase, dates : gestion du porteur, projet en cours. La
 * coordination (P4a) change seulement dates et phrase : un nom ou un type
 * différent est refusé (403), même forgé. */
export async function updateProject(personId: string, projectId: string, input: EditProjectInput) {
	await prisma.$transaction(async (tx) => {
		const project = await lockProjectContext(tx, projectId);
		const access = await projectAccess(tx, project, personId);
		if (!access.manage && !access.coordinate) throw access.reader ? managersOnly() : notFound();
		if (project.status !== 'ACTIVE') throw new ProjectError(CLOSED, 409);
		if (!access.manage) {
			const current = await tx.project.findUniqueOrThrow({
				where: { id: projectId },
				select: { name: true, kind: true }
			});
			if (current.name !== input.name || current.kind !== input.kind) {
				throw new ProjectError('Seule la gestion du projet change son nom ou son type.', 403);
			}
		}
		await tx.project.update({
			where: { id: projectId },
			data: {
				...(access.manage ? { name: input.name, kind: input.kind } : {}),
				description: input.description,
				startsOn: input.startsOn,
				dueOn: input.dueOn
			}
		});
		await act(tx, { projectId, authorId: personId, kind: 'UPDATED' });
	}, TX);
}

/** Atteint, laissé de côté, rouvert. Rouvrir repasse par le quota de
 * projets en cours du porteur, sous `project-owner:` pris en premier. */
export async function setProjectStatus(personId: string, projectId: string, to: ProjectStatus) {
	// Le porteur ne change jamais (pas de transfert au lancement) : il se lit
	// avant les verrous pour prendre `project-owner:` en tête.
	const head = await prisma.project.findUnique({
		where: { id: projectId },
		select: { ownerId: true }
	});
	if (!head) throw notFound();
	await prisma.$transaction(async (tx) => {
		await lockKey(tx, `project-owner:${head.ownerId}`);
		const project = await loadManagedProject(tx, projectId, personId);
		if (!canTransition(project.status, to)) {
			throw new ProjectError('Ce changement d’état n’est pas possible.', 409);
		}
		if (to === 'ACTIVE') {
			const active = await tx.project.count({
				where: { ownerId: project.ownerId, status: 'ACTIVE' }
			});
			if (active >= MAX_ACTIVE_PROJECTS) throw new ProjectError(QUOTA_MESSAGES.active, 409);
		}
		await tx.project.update({ where: { id: projectId }, data: { status: to } });
		await act(tx, {
			projectId,
			authorId: personId,
			kind: 'STATUS_CHANGED',
			fromStatus: project.status,
			toStatus: to
		});
	}, TX);
}

/** Supprimer le conteneur : ses liens et son journal partent avec lui ;
 * aucun morceau, crédit ni étape n'est touché (I1). */
export async function deleteProject(personId: string, projectId: string) {
	return prisma.$transaction(async (tx) => {
		await loadManagedProject(tx, projectId, personId);
		const items = await tx.projectItem.count({ where: { projectId } });
		await tx.project.delete({ where: { id: projectId } });
		return { items };
	}, TX);
}

/** Ranger un morceau que je gère (I5) dans un projet que je gère. Le
 * partage proposé par défaut suit la visibilité du morceau ; « Travail »
 * n'est jamais implicite. */
export async function addProjectItem(personId: string, projectId: string, input: AddItemInput) {
	return prisma.$transaction(async (tx) => {
		await lockProject(tx, projectId);
		const project = await loadProject(tx, projectId);
		if (!project) throw notFound();
		await lockWork(tx, input.workId);
		const work = await tx.work.findUnique({ where: { id: input.workId }, select: workHead });
		await lockOwners(tx, [ownerLockKey(project.owner), workOwnerKey(work)]);
		// Gestion du projet, ou coordination (P4a) ; jamais une simple participation.
		const access = await projectAccess(tx, project, personId);
		if (!access.manage && !access.coordinate) throw access.reader ? managersOnly() : notFound();
		if (project.status !== 'ACTIVE') throw new ProjectError(CLOSED, 409);
		// Inexistant, porteur disparu ou morceau d'autrui : même réponse.
		if (!work || !(await managesWork(tx, work, personId))) {
			throw new ProjectError(WORK_NOT_MINE, 404);
		}
		const [count, existing] = await Promise.all([
			tx.projectItem.count({ where: { projectId } }),
			tx.projectItem.findUnique({
				where: { projectId_workId: { projectId, workId: work.id } },
				select: { id: true }
			})
		]);
		if (existing) throw new ProjectError('Ce morceau est déjà rangé dans ce projet.', 409);
		if (itemsQuotaReached(count)) {
			throw new ProjectError('Ce projet a atteint le nombre maximal d’éléments.', 409);
		}
		const share = input.share ?? defaultShare(work);
		const item = await tx.projectItem.create({
			data: {
				projectId,
				workId: work.id,
				share,
				workingTitle: input.workingTitle,
				addedById: personId
			},
			select: { id: true }
		});
		await act(tx, {
			projectId,
			authorId: personId,
			kind: 'ITEM_ADDED',
			workId: work.id,
			toShare: share
		});
		return { id: item.id, share };
	}, TX);
}

/** Élément du projet courant (jamais d'un autre : identifiants forgés), son
 * morceau et les deux gestions, relues sous `project:` → `work:` → porteurs. */
async function loadItemContext(tx: Tx, projectId: string, itemId: string, personId: string) {
	await lockProject(tx, projectId);
	const project = await loadProject(tx, projectId);
	if (!project) throw notFound();
	const item = await tx.projectItem.findFirst({
		where: { id: itemId, projectId },
		select: { id: true, workId: true, share: true, workingTitle: true, addedById: true }
	});
	if (item) await lockWork(tx, item.workId);
	const work = item
		? await tx.work.findUnique({ where: { id: item.workId }, select: workHead })
		: null;
	await lockOwners(tx, [ownerLockKey(project.owner), workOwnerKey(work)]);
	const [access, workManager] = await Promise.all([
		projectAccess(tx, project, personId),
		managesWork(tx, work, personId)
	]);
	const projectManager = access.manage;
	if (!item) throw access.reader ? new ProjectError(ITEM_NOT_FOUND, 404) : notFound();
	return { project, item, projectManager, workManager, access };
}

/** Le partage se décide par la gestion **du morceau**, jamais par le seul
 * porteur du projet (§9.3). L'abaisser est toujours permis ; l'élargir
 * suppose un projet en cours. */
export async function updateProjectItemShare(
	personId: string,
	projectId: string,
	input: ItemShareInput
) {
	await prisma.$transaction(async (tx) => {
		const { project, item, workManager, access } = await loadItemContext(
			tx,
			projectId,
			input.itemId,
			personId
		);
		if (!workManager) {
			if (!access.reader) throw notFound();
			throw new ProjectError('Seule la gestion du morceau choisit son partage.', 403);
		}
		const sameShare = item.share === input.share;
		if (sameShare && item.workingTitle === input.workingTitle) return;
		if (!sameShare && !canChangeShare(project.status, item.share, input.share)) {
			throw new ProjectError('Ce projet est clos : on peut seulement réduire le partage.', 409);
		}
		if (sameShare && project.status !== 'ACTIVE') throw new ProjectError(CLOSED, 409);
		await tx.projectItem.update({
			where: { id: item.id },
			data: { share: input.share, workingTitle: input.workingTitle }
		});
		await act(tx, {
			projectId,
			authorId: personId,
			kind: 'SHARE_CHANGED',
			workId: item.workId,
			fromShare: item.share,
			toShare: input.share
		});
	}, TX);
}

/** Retirer le lien : la gestion du projet (projet en cours), la
 * coordination pour ce qu'elle a rangé (P4a, projet en cours) ou la gestion
 * du morceau (toujours). Le morceau n'est pas touché (I1). */
export async function removeProjectItem(personId: string, projectId: string, itemId: string) {
	await prisma.$transaction(async (tx) => {
		const { project, item, projectManager, workManager, access } = await loadItemContext(
			tx,
			projectId,
			itemId,
			personId
		);
		if (!workManager) {
			const mineToRemove = access.coordinate && item.addedById === personId;
			if (!projectManager && !mineToRemove) throw access.reader ? managersOnly() : notFound();
			if (project.status !== 'ACTIVE') throw new ProjectError(CLOSED, 409);
		}
		await tx.projectItem.delete({ where: { id: item.id } });
		await act(tx, {
			projectId,
			authorId: personId,
			kind: 'ITEM_REMOVED',
			workId: item.workId,
			fromShare: item.share
		});
	}, TX);
}
