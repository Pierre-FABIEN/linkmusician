/**
 * Lecture unique d'un projet (P2, D72 I6, conception 19 §9.3).
 *
 * - Projet inexistant ou inaccessible : `null`, la même réponse (404), par
 *   la même requête. Lisent la fiche : la gestion du porteur et, depuis P4a,
 *   les participant·es actif·ves (`projectReaderWhere`), jamais un simple
 *   membre du groupe ni une personne invitée ; pas de page publique.
 * - L'équipe (participant·es actif·ves, rôles libres, coordination) est
 *   visible de toute personne qui lit la fiche ; les invitations en attente,
 *   de la gestion et de la coordination seulement. Une personne bloquée
 *   n'y figure pas.
 * - Chaque élément est filtré **en base** avant tout chargement de contenu :
 *   la gestion du morceau voit le sien ; sinon seul un partage SUMMARY ou
 *   WORK révèle titre (ou titre de travail) et état, si le porteur est
 *   vivant et qu'aucun blocage ne le sépare du lecteur. Jamais de maquette,
 *   de crédit ni de lien vers `/morceaux/[id]` pour un élément d'autrui.
 * - Compteurs et journal sont calculés sur les seuls éléments visibles.
 * - U3b (D76) : besoins ouverts et pourvus pour toute personne qui lit la
 *   fiche ; propositions et refus pour la gestion et pour leur auteur·rice
 *   (`needVisible`). Un acte de besoin ne se montre qu'à qui voit le besoin.
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
import { ownerLive, projectReaderWhere, readerAccess, readerAccessSelect } from './access';
import {
	CAPABILITY_LABELS,
	PROJECT_ROLE_LABELS,
	type ProjectCapabilityValue
} from '#lib/projects/participants';

import {
	needActions,
	needLabel,
	needSearchHref,
	needSearchQuery,
	needOpportunityQuery,
	opportunityRefusal,
	needVisible,
	NEED_STATUS_LABELS,
	type NeedIntent,
	type NeedStatusValue,
	type NeedTrackValue
} from '#lib/projects/needs';

const JOURNAL_SIZE = 20;

/** Ordre d'affichage : à trancher, ouverts, pourvus, non retenus. */
const NEED_ORDER: Readonly<Record<NeedStatusValue, number>> = {
	PROPOSED: 0,
	OPEN: 1,
	FILLED: 2,
	DECLINED: 3,
	CANCELLED: 4
};

export type ProjectViewNeed = {
	id: string;
	label: string;
	/** Contenu brut, pour préremplir la modification. */
	track: NeedTrackValue;
	specialty: string | null;
	instrumentSlug: string | null;
	description: string | null;
	status: NeedStatusValue;
	statusLabel: string;
	/** Qui l'a formulé (« Toi », « Une personne », « Compte supprimé »). */
	author: string;
	mine: boolean;
	/** Qui le pourvoit, si on l'a désigné. */
	filledBy: string | null;
	/** Ce que la personne peut faire ici ; le serveur relit tout à l'écriture. */
	actions: NeedIntent[];
	/** « Trouver un pro » : un lien vers la recherche, rien d'envoyé. */
	searchHref: string | null;
	/** Les mêmes critères, pour un lien construit par `resolve` côté page. */
	searchQuery: string | null;
	/** Annonce préparée depuis ce besoin (publique, elle garde sa vie propre). */
	opportunity: { id: string; open: boolean; applications: number | null } | null;
	/** Gestion, besoin ouvert sans annonce : préremplissage de `/annonces/nouvelle`… */
	opportunityQuery: string | null;
	/** … ou la raison pour laquelle ce n'est pas possible (jamais un bouton muet). */
	opportunityRefusal: string | null;
};

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
	/** Rangé par le lecteur (la coordination retire ce qu'elle a rangé, P4a). */
	addedByMe: boolean;
};

export type ProjectTeamMember = {
	id: string;
	name: string;
	isMe: boolean;
	status: 'INVITED' | 'ACTIVE';
	role: string | null;
	coordinate: boolean;
	/** Coordination proposée, pas encore acceptée. */
	proposed: boolean;
};

/** Actes d'équipe réservés à la gestion et à la coordination. */
const TEAM_ONLY_ACTS = new Set(['INVITED', 'DECLINED']);

export type ProjectJournalEntry = {
	id: string;
	kind: string;
	author: string;
	subject: string | null;
	/** Personne concernée par un acte d'équipe (P4a). */
	person: string | null;
	capability: string | null;
	fromShare: string | null;
	toShare: string | null;
	fromStatus: string | null;
	toStatus: string | null;
	occurredAt: Date;
};

export async function projectView(projectId: string, personId: string) {
	const project = await prisma.project.findFirst({
		where: { id: projectId, ...projectReaderWhere(personId) },
		select: {
			id: true,
			name: true,
			kind: true,
			description: true,
			startsOn: true,
			dueOn: true,
			status: true,
			...readerAccessSelect(personId),
			owner: {
				select: { displayName: true, ...readerAccessSelect(personId).owner.select }
			}
		}
	});
	if (!project) return null;
	// Accès de lecture calculé sur la même ligne (aucune requête de plus).
	const access = readerAccess(project, personId);

	const itemSelect = {
		id: true,
		share: true,
		workingTitle: true,
		addedById: true,
		createdAt: true,
		workId: true,
		work: { select: { title: true, state: true, updatedAt: true } }
	} as const;
	const role = access.reader ? access.role : null;
	const [team, managed, shared, actWorkIds, needRows] = await Promise.all([
		prisma.projectParticipant.findMany({
			where: { projectId, status: { in: ['INVITED', 'ACTIVE'] } },
			orderBy: [{ status: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
			select: {
				id: true,
				status: true,
				role: true,
				capabilities: true,
				proposedCapabilities: true,
				person: {
					select: {
						id: true,
						displayName: true,
						deletedAt: true,
						...blockSelect(personId)
					}
				}
			}
		}),
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
		}),
		// U3b : filtrés en base ; la gestion lit tout (le journal en a besoin).
		prisma.projectNeed.findMany({
			where: {
				projectId,
				...(access.manage
					? {}
					: {
							OR: [
								{ status: { in: ['OPEN', 'FILLED'] } },
								{ createdById: personId, status: { in: ['PROPOSED', 'DECLINED'] } }
							]
						})
			},
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
			take: 200,
			select: {
				id: true,
				status: true,
				track: true,
				specialty: true,
				description: true,
				createdById: true,
				instrument: { select: { name: true, slug: true } },
				opportunity: {
					select: { id: true, status: true, _count: { select: { applications: true } } }
				},
				createdBy: {
					select: { id: true, displayName: true, deletedAt: true, ...blockSelect(personId) }
				},
				filledBy: {
					select: { id: true, displayName: true, deletedAt: true, ...blockSelect(personId) }
				}
			}
		})
	]);
	const needsOpen = project.status === 'ACTIVE' && ownerLive(project.owner);
	const needLabels = new Map(
		needRows.map((n) => [
			n.id,
			needLabel(n.track as NeedTrackValue, n.specialty, n.instrument?.name ?? null)
		])
	);
	const needs: ProjectViewNeed[] = needRows
		.filter((n) => needVisible({ role, author: n.createdById === personId, status: n.status }))
		.sort((a, b) => NEED_ORDER[a.status] - NEED_ORDER[b.status])
		.map((n) => {
			const author = n.createdById === personId;
			const track = n.track as NeedTrackValue;
			return {
				id: n.id,
				label: needLabels.get(n.id)!,
				track,
				specialty: n.specialty,
				instrumentSlug: n.instrument?.slug ?? null,
				description: n.description,
				status: n.status,
				statusLabel: NEED_STATUS_LABELS[n.status],
				author: authorLabel(n.createdBy, personId),
				mine: author,
				filledBy: n.filledBy ? authorLabel(n.filledBy, personId) : null,
				actions: needActions({ role, author, status: n.status, open: needsOpen }),
				searchHref:
					n.status === 'OPEN'
						? needSearchHref(track, n.specialty, n.instrument?.slug ?? null)
						: null,
				searchQuery:
					n.status === 'OPEN'
						? needSearchQuery(track, n.specialty, n.instrument?.slug ?? null)
						: null,
				opportunity: n.opportunity
					? {
							id: n.opportunity.id,
							open: n.opportunity.status === 'OPEN',
							// Les candidatures se lisent sur l'annonce, par son émettrice.
							applications: access.manage ? n.opportunity._count.applications : null
						}
					: null,
				...opportunityOf(n, track)
			};
		});
	function opportunityOf(
		n: (typeof needRows)[number],
		track: NeedTrackValue
	): { opportunityQuery: string | null; opportunityRefusal: string | null } {
		if (!access.manage || !needsOpen || n.status !== 'OPEN' || n.opportunity) {
			return { opportunityQuery: null, opportunityRefusal: null };
		}
		const refusal = opportunityRefusal({
			ownerIsPerson: project!.owner.kind === 'PERSON',
			ownerIsMe: project!.ownerId === personId,
			ownerIsBand: project!.owner.organization?.kind === 'BAND',
			track
		});
		return refusal
			? { opportunityQuery: null, opportunityRefusal: refusal }
			: {
					opportunityQuery: needOpportunityQuery({
						needId: n.id,
						track,
						specialty: n.specialty,
						instrumentSlug: n.instrument?.slug ?? null,
						label: needLabels.get(n.id)!
					}),
					opportunityRefusal: null
				};
	}
	const visibleNeedIds = access.manage ? [...needLabels.keys()] : needs.map((n) => n.id);

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
			manage: true,
			addedByMe: i.addedById === personId
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
			manage: false,
			addedByMe: i.addedById === personId
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
		where: {
			projectId,
			AND: [
				{ OR: [{ workId: null }, { workId: { in: [...visibleWorkIds] } }] },
				{ OR: [{ needId: null }, { needId: { in: visibleNeedIds } }] }
			]
		},
		orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
		take: JOURNAL_SIZE,
		select: {
			id: true,
			kind: true,
			workId: true,
			needId: true,
			fromShare: true,
			toShare: true,
			fromStatus: true,
			toStatus: true,
			capability: true,
			occurredAt: true,
			author: {
				select: { id: true, displayName: true, deletedAt: true, ...blockSelect(personId) }
			},
			subject: {
				select: { id: true, displayName: true, deletedAt: true, ...blockSelect(personId) }
			}
		}
	});
	const teamView = access.manage || access.coordinate;
	const journal: ProjectJournalEntry[] = acts
		.filter((a) => actVisible(a, visibleWorkIds) && (teamView || !TEAM_ONLY_ACTS.has(a.kind)))
		.map((a) => ({
			id: a.id,
			kind: a.kind,
			author: authorLabel(a.author, personId),
			subject: a.workId
				? (subjects.get(a.workId) ?? null)
				: a.needId
					? (needLabels.get(a.needId) ?? null)
					: null,
			person: a.kind in TEAM_ACT_KINDS ? authorLabel(a.subject, personId) : null,
			capability: a.capability ? CAPABILITY_LABELS[a.capability as ProjectCapabilityValue] : null,
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
		owner: {
			name: project.owner.displayName,
			isMe: project.ownerId === personId,
			/** U3 : un groupe porteur, dont les membres peuvent être invité·es (UX-8). */
			isBand: project.owner.organization?.kind === 'BAND'
		},
		/** Rôle réel, relu (P4a) : gestion, coordination ou participation. */
		role: access.role ?? ('participate' as const),
		roleLabel: PROJECT_ROLE_LABELS[access.role ?? 'participate'],
		/** Ce que la personne peut faire ici ; le serveur relit tout à l'écriture. */
		can: {
			manage: access.manage,
			coordinate: access.coordinate,
			/** Le porteur peut encore agir (un groupe dissous : lecture seule). */
			live: ownerLive(project.owner)
		},
		/** Ma participation, si j'en ai une (quitter, répondre à une proposition). */
		me: access.participation
			? {
					id: access.participation.id,
					role: access.participation.role,
					proposed: access.participation.proposedCapabilities.map((c) => CAPABILITY_LABELS[c])
				}
			: null,
		team: team
			.filter(
				(m) =>
					(m.status === 'ACTIVE' || teamView) && (m.person.id === personId || !blocked(m.person))
			)
			.map((m): ProjectTeamMember => ({
				id: m.id,
				name: m.person.deletedAt ? 'Compte supprimé' : m.person.displayName,
				isMe: m.person.id === personId,
				status: m.status as 'INVITED' | 'ACTIVE',
				role: m.role,
				coordinate: m.capabilities.includes('COORDINATE'),
				proposed: m.proposedCapabilities.includes('COORDINATE')
			})),
		items: items.map(({ createdAt: _c, workId: _w, ...rest }) => rest),
		counts: { items: items.length, composed: items.filter((i) => i.state === 'Composé').length },
		/** U3b : besoins visibles du lecteur, filtrés en base. */
		needs,
		resumable: idea ? { workId: idea.workId, title: idea.work.title } : null,
		journal
	};
}
export type ProjectView = NonNullable<Awaited<ReturnType<typeof projectView>>>;

const TEAM_ACT_KINDS = {
	INVITED: 1,
	JOINED: 1,
	DECLINED: 1,
	LEFT: 1,
	REMOVED: 1,
	CAPABILITY_GRANTED: 1,
	CAPABILITY_REVOKED: 1
} as const;

/** Blocages entre le lecteur et un acteur, dans les deux sens. */
function blockSelect(personId: string) {
	return {
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
	} as const;
}

type Labelled = {
	id: string;
	displayName: string;
	deletedAt: Date | null;
	blocksMade: unknown[];
	blocksReceived: unknown[];
};

const blocked = (a: Labelled) => a.blocksMade.length > 0 || a.blocksReceived.length > 0;

function authorLabel(author: Labelled | null, personId: string) {
	if (!author || author.deletedAt) return 'Compte supprimé';
	if (author.id === personId) return 'Toi';
	if (blocked(author)) return 'Une personne';
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
