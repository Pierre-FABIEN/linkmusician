// LINKMUSICIAN: écran de carrière (P3-12, conception 07 §4.2), page-menu
// (D50) : identité et progression, « Ta prochaine étape » selon l'ambition,
// puis une entrée par écran. Seulement des compteurs, aucun contenu.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { getDashboard } from '#lib/server/progression/dashboard';
import { pendingForMe } from '#lib/server/collaborations/service';
import { bandCounts } from '#lib/server/bands/service';
import { pendingCredits } from '#lib/server/works/service';
import { agenda, campaigns, linkable } from '#lib/server/career/service';
import { ambitionPriorities } from '#lib/career/ambition';
import { careerMapFor } from '#lib/server/career/map';
import { nudgesFor } from '#lib/server/career/nudges';
import { representationsForMe } from '#lib/server/representation/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// La garde de `(app)/+layout.server.ts` a déjà vérifié compte et personne.
	const person = (await getPersonByUserId(locals.user!.id))!;
	const [
		dashboard,
		location,
		toConfirm,
		bands,
		workCredits,
		works,
		upcoming,
		map,
		nudges,
		representations
	] = await Promise.all([
		getDashboard(person.actorId, ambitionPriorities(person.ambition)),
		getActorLocation(person.actorId),
		pendingForMe(person.actorId),
		bandCounts(person.actorId),
		pendingCredits(person.actorId),
		campaigns(person.actorId),
		agenda(person.actorId),
		// Carte de carrière (P3-13) : l'acte en cours, pour l'entrée du menu.
		careerMapFor(person.actorId, person.ambition),
		// Coups de pouce (P4-13a) : l'entrée n'apparaît que si l'on n'avance plus.
		nudgesFor(person.actorId, { onlyIfStalled: true }),
		// Accompagnement (P5-07) : propositions à trancher, accompagnements en cours.
		representationsForMe(person.actorId)
	]);
	const pendingReps = representations.filter((r) => r.status === 'PROPOSED').length;
	const isAgent = person.tracks.some((t) => t.track === 'MANAGER' || t.track === 'BOOKER');
	const inProgress = works.works.filter((w) => w.state === 'IDEA');
	return {
		dashboard: { ...dashboard, objectives: linkable(dashboard.objectives) },
		commune: location?.communeName ?? null,
		ambition: person.ambition,
		act: map.current ? (map.acts.find((a) => a.number === map.current) ?? null) : null,
		actsPassed: map.passed.length,
		counts: {
			toConfirm: toConfirm.length + workCredits + bands.invitations + pendingReps,
			bands: bands.active,
			campaigns: inProgress.length,
			openRoles: inProgress.reduce((n, w) => n + w.openRoles, 0),
			agenda: upcoming.length,
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
