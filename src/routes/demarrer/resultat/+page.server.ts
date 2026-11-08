// LINKMUSICIAN: onboarding, « premier résultat » (P1-10) : musiciens proches
// et trois premiers objectifs. Requête simple ; la recherche complète arrive
// en P2-01.
import { prisma } from '#lib/server';
import { getActorLocation } from '#lib/server/geo/queries';
import { getProgress } from '#lib/server/progression/read';
import { nextObjectives } from '#lib/server/progression/core/quests';
import { nearbyMusicians, DEFAULT_RADIUS_KM } from '#lib/server/onboarding';
import { guardStep } from '#lib/server/onboarding-guard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const data = await parent();
	guardStep('resultat', data);
	const actorId = data.actorId;
	const [person, location, progress, demos, bio] = await Promise.all([
		prisma.person.findUniqueOrThrow({ where: { actorId }, select: { travelRadiusKm: true } }),
		getActorLocation(actorId),
		getProgress(actorId, prisma),
		prisma.media.count({ where: { actorId, status: 'PUBLISHED', isDemo: true } }),
		prisma.actor.findUniqueOrThrow({ where: { id: actorId }, select: { bio: true } })
	]);
	const radius = person.travelRadiusKm ?? DEFAULT_RADIUS_KM;
	const nearby = await nearbyMusicians(actorId, radius);
	const objectives = nextObjectives({
		hasInstrument: data.state.instrumentCount > 0,
		hasGenre: data.state.genreCount > 0,
		hasZone: data.state.hasZone,
		hasBio: Boolean(bio.bio?.trim()),
		demos,
		works: 0,
		profileComplete: false,
		reciprocalConversations: 0,
		bands: 0,
		collaborations: 0,
		distinctCollaborators: 0,
		corroboratedGigs: 0,
		verifiedReleases: 0,
		distinctEndorsers: 0,
		jamAppreciations: 0
	});
	return {
		stepId: 'resultat' as const,
		nearby,
		radius,
		commune: location?.communeName ?? null,
		progress,
		objectives
	};
};
