// LINKMUSICIAN: mes objectifs (P1-11, P3-12) : les trois prochains, mis en
// avant selon l'ambition, et l'avancement global.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getDashboard } from '#lib/server/progression/dashboard';
import { linkable } from '#lib/server/career/service';
import { ambitionPriorities } from '#lib/career/ambition';
import { prisma } from '#lib/server';
import { getSoundEngineerProgress } from '#lib/server/progression/crafts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const tracks = person.tracks;
	const isSound = tracks.some((t) => t.track === 'SOUND_ENGINEER');
	const isMusician = tracks.some((t) => t.track === 'MUSICIAN');
	const [d, sound] = await Promise.all([
		getDashboard(person.actorId, ambitionPriorities(person.ambition)),
		// Objectifs de l'ingé son (P4-02b), à côté de ceux de musicien·ne.
		isSound ? getSoundEngineerProgress(person.actorId, prisma) : null
	]);
	return {
		/** Bloc musicien·ne : pour qui a ce métier (ou aucun autre ouvert). */
		musician: isMusician || !isSound,
		objectives: linkable(d.objectives),
		questProgress: d.questProgress,
		ambition: person.ambition,
		sound: sound && {
			tier: sound.tier,
			objectives: linkable(sound.objectives),
			questProgress: sound.questProgress
		},
		/** Le métier principal passe en premier. */
		soundFirst: tracks.find((t) => t.isPrimary)?.track === 'SOUND_ENGINEER'
	};
};
