/**
 * Besoins d'un projet (U3b, D76, conception 22), seul point d'écriture de
 * `ProjectNeed`.
 *
 * - L'identité vient de la session ; le client n'envoie que le contenu d'un
 *   besoin et une intention. Droits, état et auteur sont relus sous
 *   `project:` puis le verrou du porteur (`lockProjectContext`), par
 *   `projectAccess` (I7, I12, N5). Aucune clé `need:` : le besoin vit sous
 *   `project:`. Ajouter prend d'abord `project-need-author:` (quota par
 *   personne, tous projets), puis `project:`.
 * - La gestion ajoute un besoin ouvert ; la coordination le propose, et
 *   seule la gestion l'ouvre ou le refuse (N1). Ouvrir une proposition ne
 *   crée ni invitation, ni annonce, ni participation (N2).
 * - Rien ici n'émet d'événement de progression, ne crédite, ne prouve, ne
 *   touche une réputation ni un tri de recherche (N4).
 * - Une personne qui ne lit pas le projet reçoit 404 ; une personne qui le
 *   lit sans le droit, 403.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import {
	canNeed,
	LIVE_NEED_STATUSES,
	needQuota,
	NEED_QUOTA_MESSAGES,
	needTransition,
	statusOnAdd,
	isNeedTrack,
	opportunityRefusal,
	type NeedIntent,
	type NeedStatusValue
} from '#lib/projects/needs';
import type { ProjectNeedDraft } from '#lib/schema/projects/need';
import { ownerLive, projectAccess, type ProjectAccess } from './access';
import {
	act,
	lockProjectContext,
	PROJECT_NOT_FOUND,
	ProjectError,
	type LockedProject
} from './service';

type Tx = Prisma.TransactionClient;
const TX = { timeout: 15_000 } as const;
const DAY_MS = 24 * 60 * 60 * 1000;

const notFound = () => new ProjectError(PROJECT_NOT_FOUND, 404);
export const NEED_GONE = 'Ce besoin n’est plus dans le projet.';
export const NEED_ALREADY_DECIDED = 'Ce besoin a déjà été traité.';
const NOT_ALLOWED = 'Tu ne peux pas faire cela sur ce besoin.';
const CLOSED_NEEDS =
	'Ce projet est clos, ou son porteur ne peut plus agir : ses besoins se lisent sans changer.';
const READERS_ONLY = 'Seules la gestion et la coordination du projet ajoutent des besoins.';
const UNKNOWN_INSTRUMENT = 'Instrument inconnu.';
const NOT_PARTICIPANT = 'Cette personne ne participe pas au projet.';

const ACT_OF: Readonly<Record<NeedIntent, Prisma.ProjectActCreateManyInput['kind']>> = {
	update: 'NEED_UPDATED',
	withdraw: 'NEED_CANCELLED',
	open: 'NEED_OPENED',
	decline: 'NEED_DECLINED',
	fill: 'NEED_FILLED',
	reopen: 'NEED_REOPENED',
	cancel: 'NEED_CANCELLED'
};

/** Rôle d'une personne qui lit la fiche ; `null` pour une invitation en attente. */
const roleOf = (access: ProjectAccess) => (access.reader ? access.role : null);

const isOpen = (project: LockedProject) => project.status === 'ACTIVE' && ownerLive(project.owner);

/** Projet relu sous verrou, et les droits de la personne (404 si elle ne lit pas). */
async function lockedAccess(tx: Tx, projectId: string, personId: string, now: Date) {
	const project = await lockProjectContext(tx, projectId);
	const access = await projectAccess(tx, project, personId, now);
	return { project, access };
}

async function instrumentId(tx: Tx, draft: ProjectNeedDraft) {
	if (draft.track !== 'MUSICIAN' || !draft.instrument) return null;
	const row = await tx.instrument.findFirst({
		where: { slug: draft.instrument, active: true },
		select: { id: true }
	});
	if (!row) throw new ProjectError(UNKNOWN_INSTRUMENT, 400);
	return row.id;
}

function content(draft: ProjectNeedDraft, instrument: string | null) {
	return {
		track: draft.track,
		specialty: draft.track === 'MUSICIAN' ? null : draft.specialty,
		instrumentId: instrument,
		description: draft.description
	};
}

/**
 * Ajouter un besoin : ouvert pour la gestion, proposé pour la coordination
 * (§4). Projet en cours, porteur vivant ; quotas (Q93).
 */
export async function addNeed(
	personId: string,
	projectId: string,
	draft: ProjectNeedDraft,
	now = new Date()
) {
	return prisma.$transaction(async (tx) => {
		// Quota par personne sur 24 h, tous projets : sérialisé par une clé propre,
		// prise **avant** `project:` (aucune écriture ne la prend après).
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`project-need-author:${personId}`}))`;
		const { project, access } = await lockedAccess(tx, projectId, personId, now);
		const status = statusOnAdd(roleOf(access));
		if (!status) throw access.reader ? new ProjectError(READERS_ONLY, 403) : notFound();
		if (!isOpen(project)) throw new ProjectError(CLOSED_NEEDS, 409);
		const [live, pendingByAuthor, createdToday] = await Promise.all([
			tx.projectNeed.count({ where: { projectId, status: { in: [...LIVE_NEED_STATUSES] } } }),
			tx.projectNeed.count({ where: { projectId, createdById: personId, status: 'PROPOSED' } }),
			tx.projectNeed.count({
				where: { createdById: personId, createdAt: { gt: new Date(now.getTime() - DAY_MS) } }
			})
		]);
		const refusal = needQuota({ live, pendingByAuthor, createdToday, status });
		if (refusal) throw new ProjectError(NEED_QUOTA_MESSAGES[refusal], 409, 'quota');
		const need = await tx.projectNeed.create({
			data: {
				projectId,
				status,
				...content(draft, await instrumentId(tx, draft)),
				createdById: personId,
				...(status === 'OPEN' ? { decidedById: personId, decidedAt: now } : {})
			},
			select: { id: true, status: true }
		});
		await act(tx, {
			projectId,
			authorId: personId,
			kind: status === 'OPEN' ? 'NEED_OPENED' : 'NEED_PROPOSED',
			needId: need.id
		});
		return need;
	}, TX);
}

/** Le besoin de ce projet (jamais d'un autre : identifiant forgé), sous verrou. */
async function lockedNeed(tx: Tx, projectId: string, needId: string) {
	const need = await tx.projectNeed.findFirst({
		where: { id: needId, projectId },
		select: { id: true, status: true, createdById: true }
	});
	if (!need) throw new ProjectError(NEED_GONE, 404);
	return need;
}

/** Contrôle commun d'une intention sur un besoin existant. */
async function decide(
	tx: Tx,
	intent: NeedIntent,
	projectId: string,
	needId: string,
	personId: string,
	now: Date
) {
	const { project, access } = await lockedAccess(tx, projectId, personId, now);
	const need = await lockedNeed(tx, projectId, needId).catch((err) => {
		// Un besoin d'un projet qu'on ne lit pas ne se distingue pas d'un projet absent.
		throw access.reader ? err : notFound();
	});
	const author = need.createdById === personId;
	if (!access.reader && !author) throw notFound();
	const status = need.status as NeedStatusValue;
	const to = needTransition(intent, status);
	if (!to) throw new ProjectError(NEED_ALREADY_DECIDED, 409);
	const allowed = canNeed(intent, {
		role: roleOf(access),
		author,
		status,
		open: isOpen(project)
	});
	if (!allowed) {
		if (!isOpen(project) && intent !== 'withdraw') throw new ProjectError(CLOSED_NEEDS, 409);
		throw new ProjectError(NOT_ALLOWED, 403);
	}
	return { need, to };
}

/** Ouvrir ou refuser une proposition (gestion seule, N1). */
export async function decideNeed(
	personId: string,
	projectId: string,
	needId: string,
	decision: 'open' | 'decline',
	now = new Date()
) {
	await prisma.$transaction(async (tx) => {
		const { to } = await decide(tx, decision, projectId, needId, personId, now);
		await tx.projectNeed.update({
			where: { id: needId },
			data: { status: to, decidedById: personId, decidedAt: now }
		});
		await act(tx, { projectId, authorId: personId, kind: ACT_OF[decision], needId });
	}, TX);
}

/** Modifier un besoin : sa proposition (auteur·rice) ou tout besoin (gestion). */
export async function updateNeed(
	personId: string,
	projectId: string,
	needId: string,
	draft: ProjectNeedDraft,
	now = new Date()
) {
	await prisma.$transaction(async (tx) => {
		await decide(tx, 'update', projectId, needId, personId, now);
		await tx.projectNeed.update({
			where: { id: needId },
			data: content(draft, await instrumentId(tx, draft))
		});
		await act(tx, { projectId, authorId: personId, kind: 'NEED_UPDATED', needId });
	}, TX);
}

/** Retirer sa proposition en attente (l'auteur·rice), même sur un projet clos. */
export async function withdrawNeed(
	personId: string,
	projectId: string,
	needId: string,
	now = new Date()
) {
	await prisma.$transaction(async (tx) => {
		const { to } = await decide(tx, 'withdraw', projectId, needId, personId, now);
		await tx.projectNeed.update({ where: { id: needId }, data: { status: to } });
		await act(tx, { projectId, authorId: personId, kind: 'NEED_CANCELLED', needId });
	}, TX);
}

/** Annuler un besoin ouvert (gestion). Une annonce liée garde sa vie propre. */
export async function cancelNeed(
	personId: string,
	projectId: string,
	needId: string,
	now = new Date()
) {
	await prisma.$transaction(async (tx) => {
		const { to } = await decide(tx, 'cancel', projectId, needId, personId, now);
		await tx.projectNeed.update({
			where: { id: needId },
			data: { status: to, decidedById: personId, decidedAt: now }
		});
		await act(tx, { projectId, authorId: personId, kind: 'NEED_CANCELLED', needId });
	}, TX);
}

/**
 * Marquer pourvu (gestion, coordination), en désignant éventuellement une
 * participation **active** du projet. Aucune invitation, participation,
 * tâche, crédit ni XP (N2, N4) : c'est un repère pour l'équipe.
 */
export async function fillNeed(
	personId: string,
	projectId: string,
	needId: string,
	participantId: string | null,
	now = new Date()
) {
	await prisma.$transaction(async (tx) => {
		const { to } = await decide(tx, 'fill', projectId, needId, personId, now);
		let filledById: string | null = null;
		if (participantId) {
			const row = await tx.projectParticipant.findFirst({
				where: { id: participantId, projectId, status: 'ACTIVE' },
				select: { personId: true }
			});
			if (!row) throw new ProjectError(NOT_PARTICIPANT, 404);
			filledById = row.personId;
		}
		await tx.projectNeed.update({
			where: { id: needId },
			data: { status: to, filledById, decidedById: personId, decidedAt: now }
		});
		await act(tx, {
			projectId,
			authorId: personId,
			kind: 'NEED_FILLED',
			needId,
			...(filledById ? { subjectId: filledById } : {})
		});
	}, TX);
}

/** Rouvrir un besoin pourvu (gestion, coordination). */
export async function reopenNeed(
	personId: string,
	projectId: string,
	needId: string,
	now = new Date()
) {
	await prisma.$transaction(async (tx) => {
		const { to } = await decide(tx, 'reopen', projectId, needId, personId, now);
		await tx.projectNeed.update({
			where: { id: needId },
			data: { status: to, filledById: null, decidedById: personId, decidedAt: now }
		});
		await act(tx, { projectId, authorId: personId, kind: 'NEED_REOPENED', needId });
	}, TX);
}

/**
 * Révocation (§6.2, I12) : une personne qui perd la coordination, quitte le
 * projet ou en est retirée voit ses propositions **en attente** annulées,
 * dans la transaction qui retire le droit (sous `project:`, déjà tenu). Ses
 * besoins ouverts restent : ils appartiennent au projet.
 */
export async function cancelPendingNeeds(
	tx: Tx,
	projectId: string,
	personId: string,
	authorId: string
) {
	const pending = await tx.projectNeed.findMany({
		where: { projectId, createdById: personId, status: 'PROPOSED' },
		select: { id: true }
	});
	if (pending.length === 0) return 0;
	await tx.projectNeed.updateMany({
		where: { id: { in: pending.map((n) => n.id) } },
		data: { status: 'CANCELLED' }
	});
	for (const { id } of pending) {
		await act(tx, { projectId, authorId, kind: 'NEED_CANCELLED', needId: id, subjectId: personId });
	}
	return pending.length;
}

/**
 * Lier une annonce qui vient d'être créée au besoin dont elle est préparée
 * (U3b-c, conception 22 §7.3). Dans la transaction de `createOpportunity`,
 * sous `project:` puis le verrou du porteur : la gestion, l'état `OPEN`, aucun
 * lien existant, un porteur **personne** qui est l'émettrice (Q100 : au nom
 * d'un groupe, on ne publie qu'un recrutement), un métier d'annonce qui
 * correspond. L'annonce garde sa vie propre ; elle ne nomme pas le projet (Q97).
 */
export async function linkNeedToOpportunity(
	tx: Tx,
	input: {
		personId: string;
		needId: string;
		opportunityId: string;
		issuerId: string;
		/** Métier visé par l'annonce ; `null` pour un·e musicien·ne. */
		targetTrack: string | null;
	},
	now = new Date()
) {
	const head = await tx.projectNeed.findUnique({
		where: { id: input.needId },
		select: { projectId: true }
	});
	if (!head) throw new ProjectError(NEED_GONE, 404);
	const { project, access } = await lockedAccess(tx, head.projectId, input.personId, now);
	if (!access.reader) throw notFound();
	if (!access.manage) throw new ProjectError(NOT_ALLOWED, 403);
	if (!isOpen(project)) throw new ProjectError(CLOSED_NEEDS, 409);
	const need = await tx.projectNeed.findUniqueOrThrow({
		where: { id: input.needId },
		select: { status: true, track: true, opportunityId: true }
	});
	if (need.status !== 'OPEN' || need.opportunityId) {
		throw new ProjectError(NEED_ALREADY_DECIDED, 409);
	}
	if (!opportunityPossible(project.owner, input.personId, need.track)) {
		throw new ProjectError(NO_OPPORTUNITY, 409);
	}
	if (project.owner.id !== input.issuerId) throw new ProjectError(NO_OPPORTUNITY, 409);
	const expected = need.track === 'MUSICIAN' ? null : need.track;
	if (input.targetTrack !== expected) {
		throw new ProjectError('L’annonce doit chercher le même métier que le besoin.', 400);
	}
	await tx.projectNeed.update({
		where: { id: input.needId },
		data: { opportunityId: input.opportunityId }
	});
	await act(tx, {
		projectId: head.projectId,
		authorId: input.personId,
		kind: 'NEED_LINKED',
		needId: input.needId
	});
}

export const NO_OPPORTUNITY =
	'Une annonce ne se prépare depuis un besoin que dans un projet porté en ton nom, pour un·e musicien·ne, un·e ingé son ou un·e producteur·rice.';

/** Une annonce peut-elle être préparée depuis ce besoin (Q99, Q100) ? */
export function opportunityPossible(
	owner: { id: string; kind: string; organization?: { kind: string } | null },
	personId: string,
	track: string
) {
	return (
		isNeedTrack(track) &&
		opportunityRefusal({
			ownerIsPerson: owner.kind === 'PERSON',
			ownerIsMe: owner.id === personId,
			ownerIsBand: owner.organization?.kind === 'BAND',
			track
		}) === null
	);
}
