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
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// La garde de `(app)/+layout.server.ts` a déjà vérifié compte et personne.
	const person = (await getPersonByUserId(locals.user!.id))!;
	const [dashboard, location, toConfirm, bands, workCredits, works, upcoming] = await Promise.all([
		getDashboard(person.actorId, ambitionPriorities(person.ambition)),
		getActorLocation(person.actorId),
		pendingForMe(person.actorId),
		bandCounts(person.actorId),
		pendingCredits(person.actorId),
		campaigns(person.actorId),
		agenda(person.actorId)
	]);
	const inProgress = works.works.filter((w) => w.state === 'IDEA');
	return {
		dashboard: { ...dashboard, objectives: linkable(dashboard.objectives) },
		commune: location?.communeName ?? null,
		ambition: person.ambition,
		counts: {
			toConfirm: toConfirm.length + workCredits + bands.invitations,
			bands: bands.active,
			campaigns: inProgress.length,
			openRoles: inProgress.reduce((n, w) => n + w.openRoles, 0),
			agenda: upcoming.length,
			gains: dashboard.history.length
		},
		hidden: person.actor.hidden
	};
};
