// LINKMUSICIAN: référentiels instruments et genres, en lecture seule (P1-04).
// Pour les modifier : `prisma/seed-data/`, puis `npm run seed:referentiels`.
import { assertAdmin } from '#lib/admin/guards';
import { listGenreTree, listInstrumentsByFamily } from '#lib/prisma/skills/referentials';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	assertAdmin(locals);
	const [families, genres] = await Promise.all([
		listInstrumentsByFamily({ includeInactive: true }),
		listGenreTree({ includeInactive: true })
	]);
	return { families, genres };
}) satisfies PageServerLoad;
