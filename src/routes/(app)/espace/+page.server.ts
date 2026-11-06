// LINKMUSICIAN: tableau de bord de progression (P1-11), calculé côté serveur
// (`#lib/server/progression/dashboard`).
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { getDashboard } from '#lib/server/progression/dashboard';
import { pendingForMe } from '#lib/server/collaborations/service';
import { suggestMusicians } from '#lib/server/discovery/suggestions';
import { prisma } from '#lib/server';
import { bandCounts } from '#lib/server/bands/service';
import type { PageServerLoad } from './$types';

/** Écrans déjà construits : un objectif qui mène ailleurs est affiché « bientôt ». */
const AVAILABLE = [
	'/profil',
	'/profil/musical',
	'/profil/ville',
	'/profil/medias',
	'/annonces',
	'/groupes'
];

export const load: PageServerLoad = async ({ locals }) => {
	// La garde de `(app)/+layout.server.ts` a déjà vérifié compte et personne.
	const person = (await getPersonByUserId(locals.user!.id))!;
	const [dashboard, location, toConfirm, suggestions, bands] = await Promise.all([
		getDashboard(person.actorId),
		getActorLocation(person.actorId),
		// Collaborations qui attendent ma réponse ou ma confirmation (P2-06).
		pendingForMe(person.actorId),
		// « Des musicien·nes pour toi » (P2-18).
		suggestMusicians(person.actorId, { db: prisma }),
		// Mes groupes (P3-01) : nombre de groupes et invitations reçues.
		bandCounts(person.actorId)
	]);
	return {
		dashboard: {
			...dashboard,
			objectives: dashboard.objectives.map((o) => ({
				...o,
				href: AVAILABLE.includes(o.href) ? o.href : null
			}))
		},
		commune: location?.communeName ?? null,
		toConfirm,
		suggestions,
		bands,
		// Sans suggestion : ce qui manque pour en recevoir.
		suggestionsHint: location
			? {
					text: 'Tes suggestions viennent de tes instruments et de tes genres.',
					href: '/profil/musical',
					label: 'Compléter mon profil musical'
				}
			: {
					text: 'Indique ta ville pour voir qui joue près de chez toi.',
					href: '/profil/ville',
					label: 'Indiquer ma ville'
				},
		hidden: person.actor.hidden
	};
};
