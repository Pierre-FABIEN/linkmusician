/**
 * LINKMUSICIAN: documents imprimables (P3-15b) : bulletin de partage,
 * programme des œuvres. Sans la navigation de l'espace, pour une page
 * propre à imprimer ; même exigence de compte que l'espace `(app)`.
 */
import { redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { currentSuspension } from '#lib/server/moderation/service';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) redirect(302, '/auth/login');
	if (!user.emailVerified) redirect(302, '/auth/verify-email');
	const person = await getPersonByUserId(user.id);
	if (!person || !person.onboardedAt) redirect(302, '/jouer');
	if (await currentSuspension(person.actorId)) redirect(302, '/suspendu');
	return { actorId: person.actorId };
};
