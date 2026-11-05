// LINKMUSICIAN: présentation pas à pas d'un mode de jeu, la première fois
// (P2-12b) : trois étapes, puis « C'est parti ».
import { error, redirect } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getDashboard } from '#lib/server/progression/dashboard';
import { PLAY_MODE_INFO, modeFromSlug } from '#lib/linkmusician/modes';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const mode = modeFromSlug(params.mode);
	if (!mode) error(404, 'Mode inconnu');
	const person = (await getPersonByUserId(locals.user!.id))!;
	// Carrière : la vraie première étape de la personne, pour finir concret.
	const firstStep =
		mode === 'CAREER' ? ((await getDashboard(person.actorId)).objectives[0]?.label ?? null) : null;
	return { mode, firstStep };
};

export const actions: Actions = {
	start: async ({ locals, params }) => {
		const mode = modeFromSlug(params.mode);
		if (!mode) error(404, 'Mode inconnu');
		const person = (await getPersonByUserId(locals.user!.id))!;
		await prisma.person.update({
			where: { actorId: person.actorId },
			data: {
				preferredMode: mode,
				modeIntrosSeen: [...new Set([...person.modeIntrosSeen, mode])]
			}
		});
		redirect(303, PLAY_MODE_INFO[mode].href);
	}
};
