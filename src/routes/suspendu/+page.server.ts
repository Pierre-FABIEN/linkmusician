// LINKMUSICIAN: page affichée à un compte suspendu (P1-12).
import { redirect } from '@sveltejs/kit';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { currentSuspension } from '#lib/server/moderation/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/auth/login');
	const person = await getPersonByUserId(locals.user.id);
	const suspension = person ? await currentSuspension(person.actorId) : null;
	if (!suspension) redirect(302, '/espace');
	return { until: suspension.until, reason: suspension.reason };
};
