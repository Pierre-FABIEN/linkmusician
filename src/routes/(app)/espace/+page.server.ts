// LINKMUSICIAN: tableau de bord de progression (P1-11), calculé côté serveur
// (`#lib/server/progression/dashboard`).
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { getDashboard } from '#lib/server/progression/dashboard';
import { pendingForMe } from '#lib/server/collaborations/service';
import { bandCounts } from '#lib/server/bands/service';
import { pendingCredits } from '#lib/server/works/service';
import type { PageServerLoad } from './$types';

/** Écrans déjà construits : un objectif qui mène ailleurs est affiché « bientôt ». */
const AVAILABLE = [
	'/profil',
	'/profil/musical',
	'/profil/ville',
	'/profil/medias',
	'/annonces',
	'/groupes',
	'/morceaux'
];

export const load: PageServerLoad = async ({ locals }) => {
	// La garde de `(app)/+layout.server.ts` a déjà vérifié compte et personne.
	const person = (await getPersonByUserId(locals.user!.id))!;
	const [dashboard, location, toConfirm, bands, workCredits] = await Promise.all([
		getDashboard(person.actorId),
		getActorLocation(person.actorId),
		// Collaborations qui attendent ma réponse ou ma confirmation (P2-06).
		pendingForMe(person.actorId),
		// Mes groupes (P3-01) : nombre de groupes et invitations reçues.
		bandCounts(person.actorId),
		// Mes morceaux (P3-11) : crédits qui attendent ma confirmation.
		pendingCredits(person.actorId)
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
		bands,
		workCredits,
		hidden: person.actor.hidden
	};
};
