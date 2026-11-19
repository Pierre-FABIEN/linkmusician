// LINKMUSICIAN: écran de carrière (P3-12, conception 07 §4.2), page-menu
// (D50) : identité et progression, « Ta prochaine étape » selon l'ambition,
// puis une entrée par écran. Seulement des compteurs, aucun contenu.
import { inboxFor, representationsForMeOnce, spacePriorities } from '#lib/server/space/inbox';
import { isNewAccount, pickHero } from '#lib/career/next';
import type { CollabHero } from '#lib/components/linkmusician/metro/CollabAdvance.svelte';
import { readNavigation } from '#lib/server/actors/navigation';
import { roleMenu } from '#lib/linkmusician/navigation';
import { TRACKS } from '#lib/actors/tracks';
import { prisma } from '#lib/server';
import {
	getSoundEngineerProgress,
	getProducerProgress,
	getPromoterProgress,
	getAgentProgress
} from '#lib/server/progression/crafts';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { getDashboard } from '#lib/server/progression/dashboard';
import { bandCounts } from '#lib/server/bands/service';
import { campaigns, linkable } from '#lib/server/career/service';
import { nextActionsFor, readChoices, suggestionView } from '#lib/server/career/next';
import { ChoiceError, chooserOf, declineSuggestion, postpone } from '#lib/server/career/choices';
import { fail, type Cookies } from '@sveltejs/kit';
import type { TrackKindValue } from '#lib/actors/tracks';
import { ambitionPriorities } from '#lib/career/ambition';
import { careerMapFor } from '#lib/server/career/map';
// U2 : « Mes projets » (projection groupée) et le projet principal du héros.
import { outsideCount, projectsOverview } from '#lib/server/projects/overview';
import { homeProjects, mainProject } from '#lib/projects/overview';
import { nudgesFor } from '#lib/server/career/nudges';
import type { Actions, PageServerLoad } from './$types';

type Person = NonNullable<Awaited<ReturnType<typeof getPersonByUserId>>>;

/** Rang et objectifs du métier actif (sauf musicien·ne, lus par le tableau de bord). */
function roleProgressFor(person: Person, track: TrackKindValue) {
	return track === 'SOUND_ENGINEER'
		? getSoundEngineerProgress(person.actorId, prisma)
		: track === 'PRODUCER'
			? getProducerProgress(person.actorId, prisma)
			: track === 'PROMOTER'
				? getPromoterProgress(person.actorId, prisma)
				: track === 'MANAGER' || track === 'BOOKER'
					? getAgentProgress(person.actorId, track, prisma)
					: Promise.resolve(null);
}

/**
 * Objectif proposé au rang 5 : celui du métier actif. Celui du musicien
 * n'est pas repris : il est déjà en tête de « repères », et redevient le
 * héros quand rien d'autre n'attend (U0, D74).
 */
function objectiveOf(track: TrackKindValue, progress: Awaited<ReturnType<typeof roleProgressFor>>) {
	return track === 'MUSICIAN' ? null : (linkable(progress?.objectives ?? [])[0] ?? null);
}

/** « Ta prochaine étape » (P2-12b) : un objectif, et où il en est. */
function objectiveStep(
	o: { label: string; href: string | null; xp?: number },
	progress: { done: number; total: number }
) {
	return {
		index: Math.min(progress.done + 1, progress.total),
		total: progress.total,
		title: o.label,
		text: o.xp
			? `Une étape réelle de ta carrière : environ ${o.xp} XP à la clé.`
			: 'Une étape réelle de ta carrière, à franchir avec d’autres.',
		href: o.href ?? '/annonces',
		cta: o.href ? 'J’y vais' : 'Bientôt disponible'
	};
}

export const load: PageServerLoad = async ({ locals, cookies }) => {
	// N3 : les lectures communes (carte, priorités, accompagnement) partent une
	// fois par requête, partagées avec le layout et les prochaines actions.
	const scope = locals;
	// La garde de `(app)/+layout.server.ts` a déjà vérifié compte et personne.
	const person = (await getPersonByUserId(locals.user!.id))!;
	const navigation = readNavigation(person, cookies)!;
	const track = navigation.active;
	const roleProgress = roleProgressFor(person, track);
	const [
		professional,
		dashboard,
		location,
		bands,
		works,
		map,
		nudges,
		representations,
		priorities,
		next,
		choices,
		inbox,
		projects,
		outside
	] = await Promise.all([
		roleProgress,
		getDashboard(person.actorId, ambitionPriorities(person.ambition)),
		getActorLocation(person.actorId),
		bandCounts(person.actorId),
		campaigns(person.actorId),
		// Carte de carrière (N2) : les épreuves à portée, pour l'entrée du menu.
		careerMapFor(person.actorId, person.ambition, undefined, scope),
		// Coups de pouce (P4-13a) : l'entrée n'apparaît que si l'on n'avance plus.
		nudgesFor(person.actorId, { onlyIfStalled: true }),
		// Accompagnement (P5-07) : propositions à trancher, accompagnements en cours.
		representationsForMeOnce(person.actorId, scope),
		spacePriorities(person, track, undefined, scope),
		// Prochaines actions (N3) : trois au plus, héros compris (U0, D74). L'objectif
		// musicien reste dans « repères » ; un métier propose le sien au rang 5.
		(async () => {
			const p = await roleProgress;
			return nextActionsFor(person, { request: scope, objective: objectiveOf(track, p) });
		})(),
		// N4 : la même lecture que le moteur (mémorisée), pour l'état « tout écarté ».
		readChoices(person.actorId, scope),
		// U0 : « À traiter », déjà lu par le moteur (mémorisé).
		inboxFor(person, undefined, scope),
		// U2 : mes projets, en une projection groupée (jamais une fiche par tuile).
		projectsOverview(person.actorId),
		outsideCount(person.actorId)
	]);
	const now = Date.now();
	// Les propositions à trancher, comme « À traiter » (sans blocage avec l'agent).
	const pendingReps = inbox.representations.length;
	const confirmedReps = representations.filter((r) => r.status === 'CONFIRMED').length;
	const objectives = linkable(dashboard.objectives);
	const quest = track === 'MUSICIAN' ? dashboard.questProgress : professional?.questProgress;
	const firstObjective =
		track === 'MUSICIAN' ? objectives[0] : linkable(professional?.objectives ?? [])[0];
	const step = firstObjective && quest ? objectiveStep(firstObjective, quest) : null;
	const views = next.map(suggestionView);
	// D74, étape 2 : sans demande, le projet principal, déduit de ma dernière
	// action (UX-3, défaut) ; le métier affiché n'entre pas dans ce choix.
	const main = mainProject(projects);
	const choice = pickHero(views, {
		hasProject: main !== null,
		newAccount: isNewAccount({
			works: works.works.length,
			bands: bands.active,
			trialsPassed: map.passed.length
		}),
		hasObjective: step !== null
	});
	const hero: CollabHero =
		choice.kind === 'action'
			? { kind: 'action', action: choice.action }
			: choice.kind === 'project' && main
				? { kind: 'project', project: main }
				: choice.kind === 'objective' && step
					? { kind: 'objective', step }
					: { kind: 'start' };
	const isAgent = person.tracks.some((t) => t.track === 'MANAGER' || t.track === 'BOOKER');
	return {
		priorities,
		/** U0 (D74) : le héros, puis la suite des prochaines actions et les tuiles. */
		advance: {
			hero,
			rest: choice.rest,
			/** N4 : la personne a écarté ou reporté quelque chose (lien vers ses choix). */
			hasChoices:
				choices.notForMe.length > 0 ||
				choices.later.some((c) => c.until !== null && c.until.getTime() > now),
			projects: {
				tiles: homeProjects(projects, hero.kind === 'project' ? hero.project.id : null),
				active: projects.filter((p) => p.status === 'ACTIVE').length,
				// « Hors projet » dès qu'il y a des morceaux dans le parcours (ceux
				// de l'ancienne entrée « Travaux en cours » compris).
				outside: works.works.length > 0 || outside > 0 ? outside : null
			}
		},
		/** L'objectif, en tête de « repères » quand il n'est pas le héros. */
		step: hero.kind === 'objective' ? null : step,
		roleSpace:
			track === 'MUSICIAN'
				? null
				: {
						title: TRACKS[track].label,
						available: TRACKS[track].available,
						entries: roleMenu(track),
						tier: professional?.tier ?? null
					},
		dashboard: { ...dashboard, objectives },
		commune: location?.communeName ?? null,
		ambition: person.ambition,
		/** Première épreuve à portée (N2), sans « acte en cours ». */
		withinReach: map.withinReach.map((a) => ({ name: a.name, reason: a.reach?.reason ?? '' })),
		actsPassed: map.passed.length,
		counts: {
			bands: bands.active,
			gains: dashboard.history.length
		},
		nudges: nudges.nudges.length,
		/** Entrée « Accompagnement » : pour les agents, ou qui est accompagné·e (P5-07). */
		representation:
			isAgent || representations.length > 0
				? { pending: pendingReps, current: confirmedReps, isAgent }
				: null,
		hidden: person.actor.hidden
	};
};

/**
 * N4 : « Plus tard » et « Pas pour moi ». Les actions ne passent pas par la
 * garde du layout : la session, la personne et la suspension sont relues
 * (`chooserOf`).
 * Le client n'envoie que la clé ; le serveur vérifie qu'il la propose.
 */
async function choose(
	locals: App.Locals,
	cookies: Cookies,
	request: Request,
	gesture: typeof postpone | typeof declineSuggestion
) {
	const person = await chooserOf(locals);
	const raw = (await request.formData()).get('key');
	const key = typeof raw === 'string' ? raw : '';
	const track = readNavigation(person, cookies)?.active ?? 'MUSICIAN';
	try {
		const objective = objectiveOf(track, await roleProgressFor(person, track));
		await gesture(person, key, { objective });
		return { ok: true as const };
	} catch (err) {
		if (err instanceof ChoiceError) return fail(err.status, { choiceError: err.message });
		throw err;
	}
}

export const actions: Actions = {
	later: async ({ locals, cookies, request }) => {
		const r = await choose(locals, cookies, request, postpone);
		return 'ok' in r
			? { message: 'Reportée : elle revient dans 30 jours, ou plus tôt si quelque chose change.' }
			: r;
	},
	notForMe: async ({ locals, cookies, request }) => {
		const r = await choose(locals, cookies, request, declineSuggestion);
		return 'ok' in r
			? {
					message:
						'Ce type de suggestion ne te sera plus proposé. Tu peux le réactiver à tout moment.'
				}
			: r;
	}
};
