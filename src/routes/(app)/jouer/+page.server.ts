// LINKMUSICIAN: accueil de l'espace, le « menu du jeu » (P2-12, D21) :
// mode carrière ou mode jam, le dernier choix retenu.
import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getProgress } from '#lib/server/progression/read';
import { PLAY_MODE_INFO, isPlayMode } from '#lib/linkmusician/modes';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const progress = await getProgress(person.actorId, prisma);
	return { preferredMode: person.preferredMode, level: progress.level };
};

export const actions: Actions = {
	choose: async ({ locals, request }) => {
		const mode = (await request.formData()).get('mode');
		if (!isPlayMode(mode)) return fail(400, { error: 'Mode inconnu.' });
		const person = (await getPersonByUserId(locals.user!.id))!;
		await prisma.person.update({
			where: { actorId: person.actorId },
			data: { preferredMode: mode }
		});
		redirect(303, PLAY_MODE_INFO[mode].href);
	}
};
