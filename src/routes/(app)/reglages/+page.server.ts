/**
 * LINKMUSICIAN: réglages (P1-09) : palier de confiance, conditions du palier
 * suivant, quotas. Lecture seule : la confiance se calcule côté serveur.
 */
import { prisma } from '#lib/server';
import { requirePerson } from '#server/actors/tracksForm';
import { trustSummaryFor } from '#lib/server/progression/trust';
import {
	computeTrustLevel,
	nextTrustRequirements,
	TRUST_PERMISSIONS
} from '#lib/server/progression/core/trust';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = await requirePerson(locals);
	const summary = await trustSummaryFor(prisma, person.actorId);
	// Le palier affiché est recalculé à la volée : il ne dépend pas du passage
	// de la tâche nocturne (l'ancienneté a pu faire passer un palier).
	const level = summary ? computeTrustLevel(summary) : 0;
	return {
		trust: {
			level,
			permissions: TRUST_PERMISSIONS[level],
			...(summary ? nextTrustRequirements(summary) : { next: 1 as const, requirements: [] })
		}
	};
};
