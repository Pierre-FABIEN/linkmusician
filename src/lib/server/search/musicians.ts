/**
 * Recherche de musicien·nes (P2-01) : une requête PostGIS (rayon autour de
 * la commune de la personne qui cherche, filtres de profil), puis lecture
 * des fiches. Seuls les profils publics sont trouvables (`publicActorWhere`
 * en SQL : ni anonymisé, ni masqué, ni suspendu). Tri par proximité ; la
 * réputation s'ajoutera avec P2-08.
 *
 * La distance exacte ne sort jamais d'ici : seulement sa tranche
 * (`distanceBand`). D'où une pagination par numéro de page, pas par curseur
 * (un curseur porterait la distance).
 *
 * Imports relatifs : utilisé aussi par le test d'intégration, hors SvelteKit.
 */
import { Prisma, type PrismaClient } from '@prisma/client';
import { distanceBand } from '../../geo/distance';
import { PAGE_SIZE, type SearchFilters } from '../../search/filters';
import { qualifiedTable, schemaOf } from '../db-schema';

/** Rayon de déplacement supposé quand la personne n'en a pas indiqué. */
export const DEFAULT_TRAVEL_KM = 25;

type Target = { db: PrismaClient; schema?: string };

/** Identifiants des profils trouvés, du plus proche au plus lointain. */
export async function searchMusicianIds(
	searcherId: string,
	filters: SearchFilters,
	{ db, schema = schemaOf() }: Target,
	now = new Date()
) {
	const t = (name: string) => qualifiedTable(name, schema);
	const radiusM = filters.radius * 1000;
	const conditions: Prisma.Sql[] = [];
	if (filters.instrument) {
		conditions.push(Prisma.sql`EXISTS (
			SELECT 1 FROM ${t('person_instruments')} pi JOIN ${t('instruments')} i ON i.id = pi."instrumentId"
			WHERE pi."personId" = a.id AND i.slug = ${filters.instrument}
			AND pi."declaredLevel" >= ${filters.minLevel ?? 1})`);
	} else if (filters.minLevel) {
		conditions.push(Prisma.sql`EXISTS (
			SELECT 1 FROM ${t('person_instruments')} pi
			WHERE pi."personId" = a.id AND pi."declaredLevel" >= ${filters.minLevel})`);
	}
	if (filters.genre) {
		// Un genre parent inclut ses sous-genres.
		conditions.push(Prisma.sql`EXISTS (
			SELECT 1 FROM ${t('actor_genres')} ag JOIN ${t('genres')} g ON g.id = ag."genreId"
			LEFT JOIN ${t('genres')} parent ON parent.id = g."parentId"
			WHERE ag."actorId" = a.id AND (g.slug = ${filters.genre} OR parent.slug = ${filters.genre}))`);
	}
	if (filters.lookingFor) {
		conditions.push(Prisma.sql`${filters.lookingFor} = ANY(p."lookingFor"::text[])`);
	}
	if (filters.proStatus) {
		conditions.push(Prisma.sql`p."proStatus"::text = ${filters.proStatus}`);
	}
	if (filters.reciprocal) {
		conditions.push(
			Prisma.sql`public.ST_DWithin(me.point, other.point, COALESCE(p."travelRadiusKm", ${DEFAULT_TRAVEL_KM}) * 1000)`
		);
	}
	const extra =
		conditions.length > 0 ? Prisma.sql`AND ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;

	const rows = await db.$queryRaw<{ actorId: string; meters: number }[]>`
		SELECT a.id AS "actorId", public.ST_Distance(me.point, other.point)::float8 AS meters
		FROM ${t('actor_locations')} me
		JOIN ${t('actor_locations')} other
			ON other."actorId" <> me."actorId" AND public.ST_DWithin(me.point, other.point, ${radiusM})
		JOIN ${t('actors')} a ON a.id = other."actorId"
		JOIN ${t('persons')} p ON p."actorId" = a.id
		WHERE me."actorId" = ${searcherId}
			AND a."deletedAt" IS NULL AND a.hidden = false
			AND p."onboardedAt" IS NOT NULL
			AND NOT EXISTS (
				SELECT 1 FROM ${t('sanctions')} s
				WHERE s."actorId" = a.id AND s.kind::text = 'SUSPENSION' AND s."liftedAt" IS NULL
				AND (s.until IS NULL OR s.until > ${now}))
			${extra}
		ORDER BY meters ASC, a.id ASC
		LIMIT ${PAGE_SIZE + 1} OFFSET ${(filters.page - 1) * PAGE_SIZE}`;
	return {
		hits: rows.slice(0, PAGE_SIZE),
		hasMore: rows.length > PAGE_SIZE
	};
}

/** Fiches des résultats, dans l'ordre, avec la tranche de distance seulement. */
export async function searchMusicians(
	searcherId: string,
	filters: SearchFilters,
	target: Target,
	now = new Date()
) {
	const { hits, hasMore } = await searchMusicianIds(searcherId, filters, target, now);
	const ids = hits.map((h) => h.actorId);
	const persons = await target.db.person.findMany({
		where: { actorId: { in: ids } },
		select: {
			actorId: true,
			proStatus: true,
			lookingFor: true,
			actor: {
				select: {
					handle: true,
					displayName: true,
					location: { select: { communeName: true } },
					genres: { select: { genre: { select: { name: true } } }, take: 3 }
				}
			},
			instruments: {
				orderBy: [{ isPrimary: 'desc' }, { declaredLevel: 'desc' }],
				take: 2,
				select: { declaredLevel: true, instrument: { select: { name: true } } }
			}
		}
	});
	const byId = new Map(persons.map((p) => [p.actorId, p]));
	const results = hits.flatMap((hit) => {
		const p = byId.get(hit.actorId);
		if (!p) return [];
		return [
			{
				handle: p.actor.handle,
				displayName: p.actor.displayName,
				commune: p.actor.location?.communeName ?? null,
				distance: distanceBand(hit.meters),
				instruments: p.instruments.map((i) => ({
					name: i.instrument.name,
					level: i.declaredLevel
				})),
				genres: p.actor.genres.map((g) => g.genre.name),
				proStatus: p.proStatus,
				lookingFor: p.lookingFor
			}
		];
	});
	return { results, hasMore };
}

export type MusicianResult = Awaited<ReturnType<typeof searchMusicians>>['results'][number];
