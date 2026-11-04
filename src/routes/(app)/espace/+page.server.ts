// LINKMUSICIAN: progression affichée dans l'espace (niveau de compte, succès).
import { prisma } from '#lib/server';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getProgress } from '#lib/server/progression/read';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// La garde de `(app)/+layout.server.ts` a déjà vérifié compte et personne.
	const person = await getPersonByUserId(locals.user!.id);
	return { progress: await getProgress(person!.actorId, prisma) };
};
