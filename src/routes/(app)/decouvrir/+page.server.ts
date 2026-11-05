/**
 * LINKMUSICIAN: recherche de musicien·nes (P2-01). Réservée aux membres
 * connectés (garde de `(app)`), limitée en débit par personne : c'est la
 * protection contre l'aspiration des profils.
 */
import { prisma } from '#lib/server';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { getActorLocation } from '#lib/server/geo/queries';
import { listGenreTree, listInstrumentsByFamily } from '#lib/prisma/skills/referentials';
import { RefillingTokenBucket } from '#lib/server/rate-limit';
import { searchMusicians } from '#lib/server/search/musicians';
import { parseFilters } from '#lib/search/filters';
import type { PageServerLoad } from './$types';

/** 60 recherches d'affilée, puis une toutes les 2 secondes. */
const searchBucket = new RefillingTokenBucket<string>(60, 2, 'search-actor');

export const load: PageServerLoad = async ({ locals, url }) => {
	const person = (await getPersonByUserId(locals.user!.id))!;
	const filters = parseFilters(url.searchParams);
	const [location, instruments, genres] = await Promise.all([
		getActorLocation(person.actorId),
		listInstrumentsByFamily(),
		listGenreTree()
	]);
	const base = {
		filters,
		commune: location?.communeName ?? null,
		instruments: instruments.map((f) => ({
			family: f.family,
			instruments: f.instruments.map((i) => ({ slug: i.slug, name: i.name }))
		})),
		genres: genres.map((g) => ({
			slug: g.slug,
			name: g.name,
			children: g.children.map((c) => ({ slug: c.slug, name: c.name }))
		}))
	};
	if (!location) return { ...base, state: 'no-location' as const, results: [], hasMore: false };
	if (!(await searchBucket.consume(person.actorId, 1))) {
		return { ...base, state: 'limited' as const, results: [], hasMore: false };
	}
	const { results, hasMore } = await searchMusicians(person.actorId, filters, { db: prisma });
	return { ...base, state: 'ok' as const, results, hasMore };
};
