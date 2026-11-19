/**
 * « Mes projets » (P3, U2 ; conception 19 §10 P3, conception 20 §6 et §7) :
 * règles pures, partagées par le serveur et le navigateur.
 *
 * - **Famille** : la composition de la fiche (enregistré, scène, autre).
 * - **Prochaine action** : une seule, choisie parmi ce que le lecteur peut
 *   réellement faire aujourd'hui (aucune invitation avant P4, aucune tâche
 *   avant P13, aucun concert simulé).
 * - **Tri** et **projet principal** : déduit de la dernière action de la
 *   personne (UX-3, défaut, aucune préférence enregistrée), stable et
 *   indépendant du métier affiché.
 * - **Hors projet** : un morceau que je gère et qu'aucun projet que je peux
 *   ouvrir ne range.
 *
 * Aucune XP lue ni produite (I3) : ces règles ne font que présenter.
 */
import type { ProjectRoleValue } from './participants';
import type { ProjectKindValue, ProjectStatusValue } from './rules';

export type ProjectFamily = 'recorded' | 'stage' | 'other';

const FAMILY_OF: Record<ProjectKindValue, ProjectFamily> = {
	SINGLE: 'recorded',
	EP: 'recorded',
	ALBUM: 'recorded',
	PRODUCTION: 'recorded',
	CONCERT: 'stage',
	TOUR: 'stage',
	FESTIVAL: 'stage',
	CAMPAIGN: 'other'
};

/** Enregistré (single, EP, album, production), scène (concert, tournée,
 * festival) ou autre (campagne ; « Autre » attend UX-2). */
export function familyOf(kind: ProjectKindValue): ProjectFamily {
	return FAMILY_OF[kind];
}

/** Ordre des blocs de la fiche après le héros (conception 20 §7.2), réduit
 * aux blocs qui existent : l'équipe (P4), les besoins (P4) et les tâches
 * (P13) ne s'affichent pas encore. */
export const FAMILY_BLOCKS: Record<ProjectFamily, readonly ('items' | 'dates' | 'journal')[]> = {
	recorded: ['items', 'dates', 'journal'],
	stage: ['dates', 'items', 'journal'],
	other: ['items', 'dates', 'journal']
};

export type ProjectNextActionKind =
	'resume' | 'range' | 'create' | 'complete' | 'invite' | 'answer' | 'consult';

export type ProjectNextAction = {
	kind: ProjectNextActionKind;
	/** Le geste, en verbe (« Ranger un morceau »). */
	label: string;
	/** Une phrase : pourquoi c'est la prochaine action. */
	text: string;
	href: string;
};

export type NextActionInput = {
	projectId: string;
	status: ProjectStatusValue;
	family: ProjectFamily;
	/** Le lecteur organise le projet : gestion ou coordination, porteur vivant. */
	manages: boolean;
	/** Rôle réel relu (P4a) ; la gestion par défaut. */
	role?: ProjectRoleValue;
	/** Autres personnes invitées ou présentes dans l'équipe, hors moi. */
	others?: number;
	/** Le porteur est un groupe : ses membres peuvent être invité·es (UX-8). */
	ownerIsBand?: boolean;
	/** Une coordination m'est proposée dans ce projet. */
	capabilityOffer?: boolean;
	/** Éléments que le lecteur voit dans ce projet. */
	visibleItems: number;
	/** Une idée rangée ici que le lecteur gère : son travail en cours. */
	resumable: { workId: string; title: string } | null;
	/** Morceaux que le lecteur gère et qui ne sont pas encore rangés ici. */
	rangeable: number;
	hasDates: boolean;
	hasDescription: boolean;
	/** U3b-c : besoins proposés par la coordination, que la gestion tranche. */
	pendingNeeds?: number;
};

/**
 * La prochaine action d'un projet, pour la gestion (conception 20 §7.1 et
 * §7.3, réduite à ce que P2 permet) :
 *
 * 1. projet clos, ou lecteur sans gestion : le consulter ;
 * 2. une idée rangée ici, que je gère : la reprendre ;
 * 3. un morceau à moi pas encore rangé : le ranger ;
 * 4. projet de scène sans date : poser ses dates ;
 * 5. projet vide sans morceau à ranger : créer un morceau ;
 * 6. projet sans date ni objectif : le compléter ;
 * 7. projet de groupe sans personne d'autre : inviter ses membres (UX-8) ;
 * 8. sinon : continuer, depuis la fiche.
 *
 * U3 (§7.3), par rôle : la **coordination** pose les dates, invite, puis
 * organise ; la **participation** répond à une coordination proposée, sinon
 * « Tu es à jour ». Aucune action ne modifie une réalisation en un geste.
 */
export function nextProjectAction(input: NextActionInput): ProjectNextAction {
	const fiche = `/projets/${input.projectId}`;
	const role = input.role ?? 'manage';
	const others = input.others ?? 0;
	if (input.status === 'ACTIVE' && role === 'participate') {
		if (input.capabilityOffer)
			return {
				kind: 'answer',
				label: 'Répondre à la proposition',
				text: 'On te propose de coordonner ce projet ; tu choisis.',
				href: `${fiche}#equipe`
			};
		return {
			kind: 'consult',
			label: 'Tu es à jour sur ce projet',
			text: 'Rien ne t’attend ici. Ce qui est partagé avec toi se lit sur la fiche.',
			href: `${fiche}#equipe`
		};
	}
	if (input.status === 'ACTIVE' && input.manages && role === 'coordinate') {
		if (!input.hasDates)
			return {
				kind: 'complete',
				label: 'Poser les dates',
				text: 'Un début, une échéance : les repères de l’équipe.',
				href: `${fiche}#modifier`
			};
		if (others === 0)
			return {
				kind: 'invite',
				label: 'Inviter quelqu’un',
				text: 'Tu coordonnes : invite les personnes qui travailleront sur ce projet.',
				href: `${fiche}#inviter`
			};
		return {
			kind: 'consult',
			label: 'Organiser le projet',
			text: 'L’équipe, les dates et ce qui est partagé avec toi.',
			href: `${fiche}#equipe`
		};
	}
	if (input.status !== 'ACTIVE' || !input.manages)
		return {
			kind: 'consult',
			label: 'Voir le projet',
			text:
				input.status === 'ACTIVE'
					? 'Le travail rangé dans ce projet.'
					: 'Ce projet est clos : il se lit sans changer.',
			href: fiche
		};
	// U3b-c (conception 22 §8.4) : une proposition attend la gestion, avant le reste.
	if (role === 'manage' && (input.pendingNeeds ?? 0) > 0)
		return {
			kind: 'answer',
			label:
				input.pendingNeeds === 1 ? 'Décider d’un besoin proposé' : 'Décider des besoins proposés',
			text: 'La coordination propose ; c’est à toi d’ouvrir ou non.',
			href: `${fiche}#besoins`
		};
	if (input.resumable)
		return {
			kind: 'resume',
			label: `Continuer « ${input.resumable.title} »`,
			text: 'Une idée rangée dans ce projet, encore en chantier.',
			href: `/morceaux/${input.resumable.workId}`
		};
	if (input.rangeable > 0)
		return {
			kind: 'range',
			label: 'Ranger un morceau',
			text:
				input.visibleItems === 0
					? 'Tu as déjà des morceaux : range ceux qui font partie de ce projet.'
					: 'D’autres morceaux à toi pourraient rejoindre ce projet.',
			href: `${fiche}#ranger`
		};
	if (input.family === 'stage' && !input.hasDates)
		return {
			kind: 'complete',
			label: 'Ajouter des dates',
			text: 'Un début, une échéance : les repères de ton projet de scène.',
			href: `${fiche}#modifier`
		};
	if (input.visibleItems === 0)
		return {
			kind: 'create',
			label: 'Créer un morceau',
			text: 'Note une première idée ; tu la rangeras ici ensuite.',
			href: '/morceaux/nouveau'
		};
	if (!input.hasDates && !input.hasDescription)
		return {
			kind: 'complete',
			label: 'Compléter le projet',
			text: 'Une phrase d’objectif ou une échéance, si tu veux.',
			href: `${fiche}#modifier`
		};
	// UX-8 : un projet de groupe sans personne d'autre ; un projet personnel
	// n'y pousse pas (l'équipe dit seulement qu'on peut inviter).
	if (input.ownerIsBand && others === 0)
		return {
			kind: 'invite',
			label: 'Inviter les membres du groupe',
			text: 'Personne d’autre n’est encore dans ce projet. Chacun·e choisira de rejoindre ou non.',
			href: `${fiche}#inviter`
		};
	return {
		kind: 'consult',
		label: 'Continuer le travail',
		text: 'Tes morceaux rangés et le journal du projet.',
		href: `${fiche}#morceaux`
	};
}

export type SortableProject = {
	id: string;
	status: ProjectStatusValue;
	/** Dernier acte posé par le lecteur dans ce projet. */
	myLastActAt: Date | null;
	/** Dernière activité que le lecteur peut voir. */
	lastActivityAt: Date | null;
	createdAt: Date;
};

const STATUS_RANK: Record<ProjectStatusValue, number> = { ACTIVE: 0, DONE: 1, ABANDONED: 2 };

const time = (d: Date | null) => (d ? d.getTime() : -Infinity);

/**
 * Ordre stable (UX-3, défaut) : en cours, puis atteints, puis laissés de
 * côté ; dans chaque état, par **ma** dernière action, puis par la dernière
 * activité visible, la création, et l'identifiant. Aucun métier, aucune XP.
 */
export function compareProjects(a: SortableProject, b: SortableProject): number {
	return (
		STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
		time(b.myLastActAt) - time(a.myLastActAt) ||
		time(b.lastActivityAt) - time(a.lastActivityAt) ||
		b.createdAt.getTime() - a.createdAt.getTime() ||
		(a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
	);
}

export function sortProjects<T extends SortableProject>(projects: readonly T[]): T[] {
	return [...projects].sort(compareProjects);
}

/** Projet principal : le premier projet en cours, déduit (UX-3) ; jamais épinglé. */
export function mainProject<T extends SortableProject>(projects: readonly T[]): T | null {
	return sortProjects(projects).find((p) => p.status === 'ACTIVE') ?? null;
}

export const HOME_PROJECTS = 3;

/**
 * Projets de l'accueil : au plus trois en tout (conception 20 §6.1). Quand
 * le principal est déjà le héros, il n'est pas répété dans les tuiles.
 */
export function homeProjects<T extends SortableProject>(
	projects: readonly T[],
	heroId: string | null
): T[] {
	const active = sortProjects(projects).filter((p) => p.status === 'ACTIVE');
	const shown = heroId ? active.filter((p) => p.id !== heroId) : active;
	return shown.slice(0, heroId ? HOME_PROJECTS - 1 : HOME_PROJECTS);
}

/** Trois sections de `/projets`, sans doublon : en cours, atteints, laissés de côté. */
export function projectSections<T extends SortableProject>(projects: readonly T[]) {
	const sorted = sortProjects(projects);
	return {
		active: sorted.filter((p) => p.status === 'ACTIVE'),
		done: sorted.filter((p) => p.status === 'DONE'),
		abandoned: sorted.filter((p) => p.status === 'ABANDONED')
	};
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

const dayFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' });

/**
 * La ligne d'avancement d'une tuile, calculée sur les seuls éléments vus
 * (I6) : jamais « 2 titres mixés sur 4 » tant que les étapes ne sont pas
 * rangées dans le projet (P9, P13).
 */
export function progressLine(input: {
	family: ProjectFamily;
	items: number;
	composed: number;
	startsOn: Date | null;
	dueOn: Date | null;
	now?: Date;
}): string {
	const { family, items, composed } = input;
	if (family === 'stage') {
		const now = input.now ?? new Date();
		const dates =
			input.startsOn && input.startsOn.getTime() >= now.getTime()
				? `Début le ${dayFormat.format(input.startsOn)}`
				: input.dueOn
					? `Échéance le ${dayFormat.format(input.dueOn)}`
					: input.startsOn
						? `Commencé le ${dayFormat.format(input.startsOn)}`
						: 'Aucune date posée';
		return items > 0 ? `${dates} · ${plural(items, 'élément rangé', 'éléments rangés')}` : dates;
	}
	if (family === 'other')
		return items === 0 ? 'Aucun élément rangé' : plural(items, 'élément rangé', 'éléments rangés');
	if (items === 0) return 'Aucun morceau rangé';
	const line = plural(items, 'morceau rangé', 'morceaux rangés');
	return composed > 0 && composed < items
		? `${line}, dont ${plural(composed, 'composé', 'composés')}`
		: composed === items
			? `${line}, ${items > 1 ? 'tous composés' : 'composé'}`
			: line;
}

/**
 * Où en est un morceau pour le lecteur, vu de « Hors projet » :
 * - `outside` : je le gère et aucun projet que je peux ouvrir ne le range ;
 * - `ranged` : je le gère et au moins un de mes projets le range (un même
 *   morceau peut être dans plusieurs projets) ;
 * - `notMine` : je n'en ai pas la gestion (crédit, groupe dont je suis
 *   simple membre) : je ne le range pas, sa gestion décide.
 *
 * Un projet que je ne peux pas ouvrir ne compte jamais : sinon « Hors
 * projet » révélerait l'existence d'un projet d'autrui.
 */
export type OutsideStatus = 'outside' | 'ranged' | 'notMine';

export function outsideStatus(work: { managed: boolean; myProjects: number }): OutsideStatus {
	if (!work.managed) return 'notMine';
	return work.myProjects > 0 ? 'ranged' : 'outside';
}
