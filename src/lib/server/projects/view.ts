/**
 * Lecture unique d'un projet (P2, D72 I6, conception 19 §9.3).
 *
 * - Projet inexistant ou inaccessible : `null`, la même réponse (404), par
 *   la même requête. Au lancement, seule la gestion du porteur lit la fiche
 *   (pas de participant·es avant P4, pas de page publique).
 * - Chaque élément est filtré **en base** avant tout chargement de contenu :
 *   la gestion du morceau voit le sien ; sinon seul un partage SUMMARY ou
 *   WORK révèle titre (ou titre de travail) et état, si le porteur est
 *   vivant et qu'aucun blocage ne le sépare du lecteur. Jamais de maquette,
 *   de crédit ni de lien vers `/morceaux/[id]` pour un élément d'autrui.
 * - Compteurs et journal sont calculés sur les seuls éléments visibles.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { manageableOwnerWhere } from '#lib/server/works/access';
import { notBlockedWith } from '#lib/server/actors/visibility';
import {
	actVisible,
	defaultShare,
	displayTitle,
	PROJECT_KIND_LABELS,
	PROJECT_STATUS_LABELS,
	SHARE_LABELS,
	type ProjectShareValue
} from '#lib/projects/rules';
import { projectManagerWhere } from './access';

const JOURNAL_SIZE = 20;

const WORK_STATE_LABELS: Record<string, string> = { IDEA: 'Idée', COMPOSED: 'Composé' };

/** Porteur d'un morceau encore lisible par un tiers du morceau (fiche et
 * projection « Mes projets », `overview.ts`). */
export function readableOwnerFor(personId: string): Prisma.ActorWhereInput {
	return {
		deletedAt: null,
		OR: [{ kind: 'PERSON' }, { kind: 'ORGANIZATION', organization: { dissolvedAt: null } }],
		...notBlockedWith(personId)
	};
}

export type ProjectViewItem = {
	id: string;
	title: string;
	state: string;
	/** Visible de la gestion du morceau seulement. */
	share: ProjectShareValue | null;
	shareLabel: string | null;
	workingTitle: string | null;
	/** Lien vers le morceau : sa gestion seulement (le partage n'ouvre jamais la page). */
	href: string | null;
	manage: boolean;
};

export type ProjectJournalEntry = {
	id: string;
	kind: string;
	author: string;
	subject: string | null;
	fromShare: string | null;
	toShare: string | null;
	fromStatus: string | null;
	toStatus: string | null;
	occurredAt: Date;
};

export async function projectView(projectId: string, personId: string) {
	const project = await prisma.project.findFirst({
		where: { id: projectId, owner: projectManagerWhere(personId) },
		select: {
			id: true,
			name: true,
			kind: true,
			description: true,
			startsOn: true,
			dueOn: true,
			status: true,
			ownerId: true,
			owner: { select: { displayName: true, kind: true } }
		}
	});
	if (!project) return null;

	const itemSelect = {
		id: true,
		share: true,
		workingTitle: true,
		createdAt: true,
		workId: true,
		work: { select: { title: true, state: true, updatedAt: true } }
	} as const;
	const [managed, shared, actWorkIds] = await Promise.all([
		prisma.projectItem.findMany({
			where: { projectId, work: { owner: manageableOwnerWhere(personId) } },
			select: itemSelect,
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
		}),
		prisma.projectItem.findMany({
			where: {
				projectId,
				share: { in: ['SUMMARY', 'WORK'] },
				work: {
					NOT: { owner: manageableOwnerWhere(personId) },
					owner: readableOwnerFor(personId)
				}
			},
			select: itemSelect,
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
		}),
		prisma.projectAct.findMany({
			where: { projectId, workId: { not: null } },
			distinct: ['workId'],
			select: { workId: true }
		})
	]);

	const items: (ProjectViewItem & { createdAt: Date; workId: string })[] = [
		...managed.map((i) => ({
			id: i.id,
			workId: i.workId,
			createdAt: i.createdAt,
			title: displayTitle('full', i.work.title, i.workingTitle),
			state: WORK_STATE_LABELS[i.work.state] ?? i.work.state,
			share: i.share,
			shareLabel: SHARE_LABELS[i.share],
			workingTitle: i.workingTitle,
			href: `/morceaux/${i.workId}`,
			manage: true
		})),
		...shared.map((i) => ({
			id: i.id,
			workId: i.workId,
			createdAt: i.createdAt,
			title: displayTitle('summary', i.work.title, i.workingTitle),
			state: WORK_STATE_LABELS[i.work.state] ?? i.work.state,
			share: null,
			shareLabel: null,
			workingTitle: null,
			href: null,
			manage: false
		}))
	].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));

	// Journal : actes du projet, et actes sur un morceau encore visible ou que
	// le lecteur gère (un élément retiré reste lisible de sa gestion).
	const subjects = new Map(items.map((i) => [i.workId, i.title]));
	const unseen = actWorkIds.flatMap((a) => (a.workId && !subjects.has(a.workId) ? [a.workId] : []));
	if (unseen.length > 0) {
		const mine = await prisma.work.findMany({
			where: { id: { in: unseen }, owner: manageableOwnerWhere(personId) },
			select: { id: true, title: true }
		});
		for (const w of mine) subjects.set(w.id, w.title);
	}
	const visibleWorkIds = new Set(subjects.keys());
	const acts = await prisma.projectAct.findMany({
		where: { projectId, OR: [{ workId: null }, { workId: { in: [...visibleWorkIds] } }] },
		orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
		take: JOURNAL_SIZE,
		select: {
			id: true,
			kind: true,
			workId: true,
			fromShare: true,
			toShare: true,
			fromStatus: true,
			toStatus: true,
			occurredAt: true,
			author: {
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
	const journal: ProjectJournalEntry[] = acts
		.filter((a) => actVisible(a, visibleWorkIds))
		.map((a) => ({
			id: a.id,
			kind: a.kind,
			author: authorLabel(a.author, personId),
			subject: a.workId ? (subjects.get(a.workId) ?? null) : null,
			fromShare: a.fromShare ? SHARE_LABELS[a.fromShare] : null,
			toShare: a.toShare ? SHARE_LABELS[a.toShare] : null,
			fromStatus: a.fromStatus ? PROJECT_STATUS_LABELS[a.fromStatus] : null,
			toStatus: a.toStatus ? PROJECT_STATUS_LABELS[a.toStatus] : null,
			occurredAt: a.occurredAt
		}));

	// U2 : l'idée que je gère, rangée ici et touchée en dernier (prochaine action).
	const idea = managed
		.filter((i) => i.work.state === 'IDEA')
		.sort((a, b) => b.work.updatedAt.getTime() - a.work.updatedAt.getTime())[0];

	return {
		id: project.id,
		name: project.name,
		kind: project.kind,
		kindLabel: PROJECT_KIND_LABELS[project.kind],
		status: project.status,
		statusLabel: PROJECT_STATUS_LABELS[project.status],
		description: project.description,
		startsOn: project.startsOn,
		dueOn: project.dueOn,
		owner: { name: project.owner.displayName, isMe: project.ownerId === personId },
		/** Au lancement, la fiche ne se lit que par la gestion du porteur. */
		role: 'manage' as const,
		items: items.map(({ createdAt: _c, workId: _w, ...rest }) => rest),
		counts: { items: items.length, composed: items.filter((i) => i.state === 'Composé').length },
		resumable: idea ? { workId: idea.workId, title: idea.work.title } : null,
		journal
	};
}
export type ProjectView = NonNullable<Awaited<ReturnType<typeof projectView>>>;

function authorLabel(
	author: {
		id: string;
		displayName: string;
		deletedAt: Date | null;
		blocksMade: unknown[];
		blocksReceived: unknown[];
	} | null,
	personId: string
) {
	if (!author || author.deletedAt) return 'Compte supprimé';
	if (author.id === personId) return 'Toi';
	if (author.blocksMade.length > 0 || author.blocksReceived.length > 0) return 'Une personne';
	return author.displayName;
}

/** Ce que je peux ranger (I5) : seulement mes morceaux, pas déjà rangés. */
export async function rangeableWorks(personId: string, projectId: string) {
	const works = await prisma.work.findMany({
		where: {
			owner: manageableOwnerWhere(personId),
			projectItems: { none: { projectId } }
		},
		orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
		take: 50,
		select: {
			id: true,
			title: true,
			state: true,
			owner: { select: { kind: true, displayName: true } }
		}
	});
	return works.map((w) => ({
		id: w.id,
		title: w.title,
		state: WORK_STATE_LABELS[w.state] ?? w.state,
		owner: w.owner.kind === 'PERSON' ? null : w.owner.displayName,
		defaultShare: defaultShare(w)
	}));
}
