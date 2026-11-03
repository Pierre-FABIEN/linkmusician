/**
 * LINKMUSICIAN: garde de l'espace LinkMusician.
 *
 * Toute page du groupe `(app)` exige un compte connecté, vérifié, **et** une
 * personne LinkMusician. Sinon, redirection vers `/bienvenue`. La garde est
 * posée ici, et non dans `hooks.server.ts`, pour que les pages du
 * boilerplate (et sa suite e2e, qui crée des comptes sans personne) restent
 * accessibles telles quelles.
 */
import { redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) redirect(302, '/auth/login');
	if (!user.emailVerified) redirect(302, '/auth/verify-email');

	const person = await getPersonByUserId(user.id);
	if (!person) redirect(302, '/bienvenue');

	return {
		person: {
			handle: person.actor.handle,
			displayName: person.actor.displayName,
			tracks: person.tracks.map((t) => ({ track: t.track, isPrimary: t.isPrimary }))
		}
	};
};
