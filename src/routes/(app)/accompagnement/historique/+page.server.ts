import { requirePerson } from '#server/actors/tracksForm';
import { representationHistoryForMe } from '#server/representation/history';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	history: await representationHistoryForMe((await requirePerson(locals)).actorId)
});
