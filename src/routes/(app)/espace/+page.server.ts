// LINKMUSICIAN: écran de carrière (P3-12, conception 07 §4.2), page-menu
// (D50) : identité et progression, « Ta prochaine étape » selon l'ambition,
// puis une entrée par écran. Seulement des compteurs, aucun contenu.
import { spacePriorities } from '#lib/server/space/priorities';
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
import {
	myRepresentations,
	nextActionsFor,
	readChoices,
	suggestionView
} from '#lib/server/career/next';
import { ChoiceError, chooserOf, declineSuggestion, postpone } from '#lib/server/career/choices';
import { fail, type Cookies } from '@sveltejs/kit';
import type { TrackKindValue } from '#lib/actors/tracks';
import { ambitionPriorities } from '#lib/career/ambition';
import { careerMapFor } from '#lib/server/career/map';
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
 * Objectif proposé au rang 5 : celui du métier actif. Le héros musicien
 * (`NextStep`) montre déjà le sien, il n'est donc pas repris.
 */
function objectiveOf(track: TrackKindValue, progress: Awaited<ReturnType<typeof roleProgressFor>>) {
	return track === 'MUSICIAN' ? null : (linkable(progress?.objectives ?? [])[0] ?? null);
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
		choices
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
		myRepresentations(person.actorId, scope),
		spacePriorities(person, track, undefined, scope),
		// Prochaines actions (N3) : trois au plus. Le héros musicien (`NextStep`)
		// montre déjà le premier objectif ; un métier propose le sien au rang 5.
		(async () => {
			const p = await roleProgress;
			return nextActionsFor(person, { request: scope, objective: objectiveOf(track, p) });
		})(),
		// N4 : la même lecture que le moteur (mémorisée), pour l'état « tout écarté ».
		readChoices(person.actorId, scope)
	]);
	const now = Date.now();
	const pendingReps = representations.filter((r) => r.status === 'PROPOSED').length;
	const isAgent = person.tracks.some((t) => t.track === 'MANAGER' || t.track === 'BOOKER');
	const inProgress = works.works.filter((w) => w.state === 'IDEA');
	return {
		priorities,
		next: next.map(suggestionView),
		/** N4 : la personne a écarté ou reporté quelque chose (lien vers ses choix). */
		hasChoices:
			choices.notForMe.length > 0 ||
			choices.later.some((c) => c.until !== null && c.until.getTime() > now),
		roleSpace:
			track === 'MUSICIAN'
				? null
				: {
						title: TRACKS[track].label,
						available: TRACKS[track].available,
						entries: roleMenu(track),
						tier: professional?.tier ?? null
					},
		dashboard: { ...dashboard, objectives: linkable(dashboard.objectives) },
		commune: location?.communeName ?? null,
		ambition: person.ambition,
		/** Première épreuve à portée (N2), sans « acte en cours ». */
		withinReach: map.withinReach.map((a) => ({ name: a.name, reason: a.reach?.reason ?? '' })),
		actsPassed: map.passed.length,
		counts: {
			bands: bands.active,
			campaigns: inProgress.length,
			openRoles: inProgress.reduce((n, w) => n + w.openRoles, 0),
			gains: dashboard.history.length
		},
		nudges: nudges.nudges.length,
		/** Entrée « Accompagnement » : pour les agents, ou qui est accompagné·e (P5-07). */
		representation:
			isAgent || representations.length > 0
				? { pending: pendingReps, current: representations.length - pendingReps, isAgent }
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
