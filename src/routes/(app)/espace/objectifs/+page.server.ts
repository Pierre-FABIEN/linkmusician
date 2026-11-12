// LINKMUSICIAN: mes objectifs (P1-11, P3-12) : les trois prochains, mis en
// avant selon l'ambition, et l'avancement global. Une section par métier du
// son (P4-02b, P4-04), le métier principal en premier.
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getDashboard } from '#lib/server/progression/dashboard';
import { linkable } from '#lib/server/career/service';
import { ambitionPriorities } from '#lib/career/ambition';
import { prisma } from '#lib/server';
import {
	getAgentProgress,
	getProducerProgress,
	getPromoterProgress,
	getSoundEngineerProgress
} from '#lib/server/progression/crafts';
import type { PageServerLoad } from './$types';

const CRAFTS = [
	{
		track: 'SOUND_ENGINEER',
		title: 'Ingé son',
		tierPrefix: 'Rang d’ingé son :',
		read: getSoundEngineerProgress
	},
	{
		track: 'PRODUCER',
		title: 'Producteur·rice',
		tierPrefix: 'Rang de producteur·rice :',
		read: getProducerProgress
	},
	// Organisateur·rice (P5-05a).
	{
		track: 'PROMOTER',
		title: 'Organisateur·rice',
		tierPrefix: 'Rang d’organisateur·rice :',
		read: getPromoterProgress
	},
	// Manager et booker (P5-07).
	{
		track: 'MANAGER',
		title: 'Manager',
		tierPrefix: 'Rang de manager :',
		read: (id: string, db: typeof prisma) => getAgentProgress(id, 'MANAGER', db)
	},
	{
		track: 'BOOKER',
		title: 'Booker',
		tierPrefix: 'Rang de booker :',
		read: (id: string, db: typeof prisma) => getAgentProgress(id, 'BOOKER', db)
	}
] as const;

export const load: PageServerLoad = async ({ locals }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const has = (track: string) => person.tracks.some((t) => t.track === track);
	const primary = person.tracks.find((t) => t.isPrimary)?.track;
	const chosen = CRAFTS.filter((c) => has(c.track));
	const [d, ...progress] = await Promise.all([
		getDashboard(person.actorId, ambitionPriorities(person.ambition)),
		...chosen.map((c) => c.read(person.actorId, prisma))
	]);
	const crafts = chosen
		.map((c, i) => ({
			track: c.track,
			title: c.title,
			tierPrefix: c.tierPrefix,
			tier: progress[i].tier,
			objectives: linkable(progress[i].objectives),
			questProgress: progress[i].questProgress
		}))
		.sort((a, b) => Number(b.track === primary) - Number(a.track === primary));
	return {
		/** Bloc musicien·ne : pour qui a ce métier (ou aucun métier du son). */
		musician: has('MUSICIAN') || crafts.length === 0,
		objectives: linkable(d.objectives),
		questProgress: d.questProgress,
		ambition: person.ambition,
		crafts,
		/** Un métier du son principal passe avant celui de musicien·ne. */
		craftsFirst: crafts.some((c) => c.track === primary)
	};
};
