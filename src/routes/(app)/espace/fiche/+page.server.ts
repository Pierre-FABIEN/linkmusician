// LINKMUSICIAN: fiche privée de carrière (P3-14), incluant les éléments déclaratifs.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { careerSheet } from '#lib/server/career/sheet';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const [sheet, publicActor] = await Promise.all([
		careerSheet(person.actorId),
		prisma.actor.findFirst({
			where: { id: person.actorId, kind: 'PERSON', ...publicActorWhere() },
			select: { id: true }
		})
	]);
	return {
		handle: person.actor.handle,
		sheet,
		canShare: publicActor !== null
	};
};
