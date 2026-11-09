// LINKMUSICIAN: point d'entrée de l'espace, le « menu du jeu » (P2-12, P2-12b,
// D21) : mode carrière ou mode jam, le dernier choix retenu ; la première
// fois, une présentation pas à pas (`/jouer/[mode]`).
import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getProgress } from '#lib/server/progression/read';
import { destinationFor, isPlayMode } from '#lib/linkmusician/modes';
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
		redirect(303, destinationFor(mode, person.modeIntrosSeen));
	},
	toggleMode: async ({ locals, request }) => {
		const mode = (await request.formData()).get('mode');
		if (!isPlayMode(mode)) return fail(400, { error: 'Mode inconnu.' });
		const person = (await getPersonByUserId(locals.user!.id))!;
		await prisma.person.update({
			where: { actorId: person.actorId },
			data: { preferredMode: mode }
		});
		redirect(303, mode === 'JAM' ? '/jam' : '/espace');
	}
};
