/**
 * Projection « Mes projets » (P3, U2 ; conception 19 §10 P3, conception 20
 * §6.1 et §7). Lecture groupée : le nombre de requêtes ne dépend ni du
 * nombre de projets ni du nombre d'éléments (jamais `projectView` par
 * tuile ; la fiche, elle, garde `projectView`).
 *
 * - Les projets dont le lecteur gère le porteur, et depuis P4a ceux où il
 *   participe (`projectReaderWhere`). Un simple membre d'un groupe ne voit
 *   pas les projets du groupe (I2).
 * - Compteurs, état d'avancement et dernière activité ne portent que sur
 *   les éléments visibles, avec les mêmes prédicats que `projectView` (I6) :
 *   un élément non partagé d'autrui n'avance aucune date et ne compte pas.
 * - Le rôle est réel (P4a) : gérer, coordonner ou participer, calculé avec
 *   les mêmes règles que `projectAccess` dans la même requête.
 * - « Hors projet » : un morceau que je gère et qu'aucun projet que je
 *   peux ouvrir ne range (`outsideStatus`).
 *
 * Aucune XP lue ni écrite (I3), aucun cache partagé : chaque lecture est
 * celle de la requête.
 */
import { prisma } from '#lib/server';
import { manageableOwnerWhere } from '#lib/server/works/access';
import { campaigns } from '#lib/server/career/service';
import { PROJECT_KIND_LABELS, PROJECT_STATUS_LABELS } from '#lib/projects/rules';
import {
	familyOf,
	nextProjectAction,
	outsideStatus,
	progressLine,
	sortProjects,
	type ProjectFamily,
	type ProjectNextAction
} from '#lib/projects/overview';
import { PROJECT_ROLE_LABELS, type ProjectRoleValue } from '#lib/projects/participants';
import {
	projectManagerWhere,
	projectReaderWhere,
	readerAccess,
	readerAccessSelect
} from './access';
import { readableOwnerFor } from './view';

/** Au-delà, `/projets` invite à clore ou supprimer (quota Q76 : 200 par porteur). */
const MAX_LISTED = 300;

export type ProjectRole = ProjectRoleValue;

export const ROLE_LABELS: Record<ProjectRole, string> = PROJECT_ROLE_LABELS;

export type ProjectSummary = {
	id: string;
	name: string;
	kind: keyof typeof PROJECT_KIND_LABELS;
	kindLabel: string;
	family: ProjectFamily;
	status: keyof typeof PROJECT_STATUS_LABELS;
	statusLabel: string;
	/** Porteur : « moi », ou le nom de la structure (que je gère). */
	owner: { name: string; isMe: boolean };
	startsOn: Date | null;
	dueOn: Date | null;
	role: ProjectRole;
	roleLabel: string;
	items: number;
	progress: string;
	nextAction: ProjectNextAction;
	lastActivityAt: Date | null;
	myLastActAt: Date | null;
	createdAt: Date;
};

/**
 * Les projets que je peux ouvrir, triés (UX-3), avec ce que montrent leurs
 * tuiles. Requêtes : 1 si je n'ai aucun projet, sinon 6, plus 1 quand le
 * journal cite un morceau retiré (comme `projectView`).
 */
export async function projectsOverview(personId: string, now = new Date()) {
	const owned = manageableOwnerWhere(personId);
	const projects = await prisma.project.findMany({
		where: projectReaderWhere(personId),
		orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
		take: MAX_LISTED,
		select: {
			id: true,
			name: true,
			kind: true,
			status: true,
			description: true,
			startsOn: true,
			dueOn: true,
			createdAt: true,
			...readerAccessSelect(personId),
			owner: {
				select: { displayName: true, ...readerAccessSelect(personId).owner.select }
			}
		}
	});
	if (projects.length === 0) return [];

	// Mêmes règles que `projectAccess`, sans requête par projet.
	const roleOf = (p: (typeof projects)[number]): ProjectRole =>
		readerAccess(p, personId, now).role ?? 'participate';
	const ids = projects.map((p) => p.id);

	const [managed, shared, acts, mine, myWorks] = await Promise.all([
		// Éléments que je gère (comme `projectView`), avec ce qu'il faut pour
		// l'état et la reprise d'une idée.
		prisma.projectItem.findMany({
			where: { projectId: { in: ids }, work: { owner: owned } },
			select: {
				projectId: true,
				workId: true,
				work: { select: { title: true, state: true, updatedAt: true } }
			}
		}),
		// Éléments d'autrui partagés et encore lisibles : ni titre ni lien ici,
		// seulement leur existence et leur état, comme sur la fiche.
		prisma.projectItem.findMany({
			where: {
				projectId: { in: ids },
				share: { in: ['SUMMARY', 'WORK'] },
				work: { NOT: { owner: owned }, owner: readableOwnerFor(personId) }
			},
			select: { projectId: true, workId: true, work: { select: { state: true } } }
		}),
		// Dernier acte par projet et par morceau : on ne retient ensuite que
		// ceux que le journal de la fiche montrerait.
		prisma.projectAct.groupBy({
			by: ['projectId', 'workId'],
			where: { projectId: { in: ids } },
			_max: { occurredAt: true }
		}),
		// Ma dernière action par projet (projet principal, UX-3).
		prisma.projectAct.groupBy({
			by: ['projectId'],
			where: { projectId: { in: ids }, authorId: personId },
			_max: { occurredAt: true }
		}),
		// Les morceaux que je gère : ce qui reste à ranger dans chaque projet.
		prisma.work.count({ where: { owner: owned } })
	]);

	type Seen = { workIds: Set<string>; composed: number; resumable: ResumeCandidate | null };
	type ResumeCandidate = { workId: string; title: string; at: number };
	const seen = new Map<string, Seen>(
		ids.map((id) => [id, { workIds: new Set(), composed: 0, resumable: null }])
	);
	const managedCount = new Map<string, number>();
	for (const i of managed) {
		const s = seen.get(i.projectId)!;
		s.workIds.add(i.workId);
		if (i.work.state === 'COMPOSED') s.composed += 1;
		managedCount.set(i.projectId, (managedCount.get(i.projectId) ?? 0) + 1);
		const at = i.work.updatedAt.getTime();
		if (i.work.state === 'IDEA' && (!s.resumable || at > s.resumable.at))
			s.resumable = { workId: i.workId, title: i.work.title, at };
	}
	for (const i of shared) {
		const s = seen.get(i.projectId)!;
		s.workIds.add(i.workId);
		if (i.work.state === 'COMPOSED') s.composed += 1;
	}

	// Un acte sur un morceau retiré reste visible de sa gestion (comme le
	// journal de la fiche) : une seule lecture pour tous les projets.
	const unseen = new Set(
		acts.flatMap((a) =>
			a.workId && !seen.get(a.projectId)!.workIds.has(a.workId) ? [a.workId] : []
		)
	);
	const stillMine =
		unseen.size > 0
			? new Set(
					(
						await prisma.work.findMany({
							where: { id: { in: [...unseen] }, owner: owned },
							select: { id: true }
						})
					).map((w) => w.id)
				)
			: new Set<string>();

	const lastActivity = new Map<string, Date>();
	for (const a of acts) {
		const at = a._max.occurredAt;
		if (!at) continue;
		const visible =
			a.workId === null || seen.get(a.projectId)!.workIds.has(a.workId) || stillMine.has(a.workId);
		if (!visible) continue;
		const prev = lastActivity.get(a.projectId);
		if (!prev || at > prev) lastActivity.set(a.projectId, at);
	}
	const myLast = new Map(mine.map((m) => [m.projectId, m._max.occurredAt ?? null]));

	const summaries: ProjectSummary[] = projects.map((p) => {
		const s = seen.get(p.id)!;
		const role = roleOf(p);
		const family = familyOf(p.kind);
		const items = s.workIds.size;
		return {
			id: p.id,
			name: p.name,
			kind: p.kind,
			kindLabel: PROJECT_KIND_LABELS[p.kind],
			family,
			status: p.status,
			statusLabel: PROJECT_STATUS_LABELS[p.status],
			owner: { name: p.owner.displayName, isMe: p.ownerId === personId },
			startsOn: p.startsOn,
			dueOn: p.dueOn,
			role,
			roleLabel: ROLE_LABELS[role],
			items,
			progress: progressLine({
				family,
				items,
				composed: s.composed,
				startsOn: p.startsOn,
				dueOn: p.dueOn,
				now
			}),
			nextAction: nextProjectAction({
				projectId: p.id,
				status: p.status,
				family,
				// La coordination range ses morceaux et pose les dates ; la
				// participation simple consulte seulement.
				manages: role !== 'participate',
				visibleItems: items,
				resumable: s.resumable && { workId: s.resumable.workId, title: s.resumable.title },
				rangeable: Math.max(0, myWorks - (managedCount.get(p.id) ?? 0)),
				hasDates: !!(p.startsOn || p.dueOn),
				hasDescription: !!p.description?.trim()
			}),
			lastActivityAt: lastActivity.get(p.id) ?? null,
			myLastActAt: myLast.get(p.id) ?? null,
			createdAt: p.createdAt
		};
	});
	return sortProjects(summaries);
}

/** Combien de mes morceaux n'appartiennent à aucun de mes projets (tuile de
 * l'accueil et de `/projets`). Une requête. */
export async function outsideCount(personId: string) {
	return prisma.work.count({
		where: {
			owner: manageableOwnerWhere(personId),
			projectItems: { none: { project: projectReaderWhere(personId) } }
		}
	});
}

/**
 * « Hors projet » (`/espace/campagnes`) : les morceaux de `campaigns`, tous
 * gardés (aucune donnée ne disparaît du parcours), classés pour le lecteur :
 * hors projet, déjà rangés (dans quels projets **à moi**), ou gérés par
 * d'autres. Deux lectures de plus que `campaigns` : l'annotation par projet
 * et les projets en cours où ranger.
 */
export async function outsideProjects(personId: string) {
	const [{ works, toConfirm }, targets] = await Promise.all([
		campaigns(personId),
		prisma.project.findMany({
			// Où ranger : gestion, ou coordination (P4a) ; le service relit tout.
			where: {
				status: 'ACTIVE',
				OR: [
					{ owner: projectManagerWhere(personId) },
					{
						participants: {
							some: { personId, status: 'ACTIVE', capabilities: { has: 'COORDINATE' } }
						}
					}
				]
			},
			orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
			take: 50,
			select: {
				id: true,
				name: true,
				ownerId: true,
				kind: true,
				owner: { select: { displayName: true } }
			}
		})
	]);
	const rows =
		works.length > 0
			? await prisma.work.findMany({
					where: { id: { in: works.map((w) => w.id) }, owner: manageableOwnerWhere(personId) },
					select: {
						id: true,
						projectItems: {
							where: { project: projectReaderWhere(personId) },
							orderBy: { createdAt: 'asc' },
							select: { project: { select: { id: true, name: true, status: true } } }
						}
					}
				})
			: [];
	const byWork = new Map(rows.map((r) => [r.id, r.projectItems.map((i) => i.project)]));
	const annotated = works.map((w) => {
		const projects = byWork.get(w.id) ?? [];
		return {
			...w,
			status: outsideStatus({ managed: byWork.has(w.id), myProjects: projects.length }),
			projects: projects.map((p) => ({
				id: p.id,
				name: p.name,
				statusLabel: PROJECT_STATUS_LABELS[p.status]
			}))
		};
	});
	return {
		outside: annotated.filter((w) => w.status === 'outside'),
		ranged: annotated.filter((w) => w.status === 'ranged'),
		others: annotated.filter((w) => w.status === 'notMine'),
		toConfirm,
		/** Mes projets en cours, où ranger un morceau (le partage se choisit sur la fiche). */
		targets: targets.map((t) => ({
			id: t.id,
			name: t.name,
			kindLabel: PROJECT_KIND_LABELS[t.kind],
			owner: t.ownerId === personId ? null : t.owner.displayName
		}))
	};
}
