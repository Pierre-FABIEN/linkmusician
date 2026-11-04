// LINKMUSICIAN: onboarding, étape « Genres » (P1-10).
import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '#lib/server';
import { listGenreTree } from '#lib/prisma/skills/referentials';
import { saveGenres, UnknownReferenceError } from '#lib/prisma/skills/musicalProfile';
import { onProfileChanged } from '#lib/server/progression/profile';
import { onboardingFor } from '#lib/server/onboarding';
import { guardStep } from '#lib/server/onboarding-guard';
import { checkGenresInput, MUSICAL_PROFILE_MESSAGES } from '#lib/skills/profile';
import { stepPath } from '#lib/onboarding/steps';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const data = await parent();
	guardStep('genres', data);
	const [genres, current, influences] = await Promise.all([
		listGenreTree(),
		prisma.actorGenre.findMany({ where: { actorId: data.actorId }, select: { genreId: true } }),
		prisma.influence.findMany({
			where: { actorId: data.actorId },
			orderBy: { sortOrder: 'asc' },
			select: { label: true }
		})
	]);
	return {
		stepId: 'genres' as const,
		genres,
		current: current.map((c) => c.genreId),
		influences: influences.map((i) => i.label).join('\n')
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const onboarding = await onboardingFor(locals.user!.id);
		if (!onboarding) redirect(303, '/bienvenue');
		const data = await request.formData();
		const genreIds = data.getAll('genreIds').map(String);
		const influences = String(data.get('influences') ?? '');
		const checked = checkGenresInput(genreIds, influences);
		if (!checked.ok)
			return fail(400, {
				error: MUSICAL_PROFILE_MESSAGES[checked.problems[0]],
				genreIds,
				influences
			});
		try {
			await saveGenres(onboarding.person, { genreIds, influences });
		} catch (err) {
			if (err instanceof UnknownReferenceError)
				return fail(400, {
					error: 'Un genre n’existe plus : recharge la page.',
					genreIds,
					influences
				});
			throw err;
		}
		await onProfileChanged(onboarding.person.actorId);
		redirect(303, stepPath('ville'));
	}
};
