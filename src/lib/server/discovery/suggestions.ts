/**
 * Suggestions de musicien·nes (P2-18) : « Des musicien·nes pour toi » (mon
 * profil musical) et « Dans le même style » (le profil que je regarde).
 *
 * Candidat·es : une requête PostGIS autour de ma commune, avec les mêmes
 * garde-fous que la recherche (profils publics, ni blocage ni suspension),
 * sans les personnes écartées (« Pas intéressé·e »). **Un·e mineur·e n'est
 * jamais suggéré·e à un adulte qui ne la connaît pas** (D5) : seulement si
 * elle est dans son réseau musical. Puis le calcul pur
 * `#lib/discovery/compatibility` ordonne. **Jamais l'XP ni le palier.**
 * La distance exacte ne sort jamais : seulement sa tranche.
 *
 * Imports relatifs : utilisé aussi par le test d'intégration, hors SvelteKit.
 */
import type { PrismaClient } from '@prisma/client';
import { adultBirthCutoff } from '../../actors/visibility';
import { DISTANCE_BANDS, distanceBand } from '../../geo/distance';
import {
	compatibility,
	rankSuggestions,
	reasonOf,
	type MusicalSide
} from '../../discovery/compatibility';
import type { InstrumentFamilyValue } from '../../skills/instruments';
import { qualifiedTable, schemaOf } from '../db-schema';

/** Rayon des suggestions : la ville et ses environs. */
export const SUGGESTION_RADIUS_KM = 50;
/** Candidat·es lu·es au plus, les plus proches, avant le calcul. */
const CANDIDATES = 200;
export const SUGGESTION_COUNT = 6;

type Target = { db: PrismaClient; schema?: string };

const SIDE_SELECT = {
	actorId: true,
	instruments: {
		select: {
			declaredLevel: true,
			isPrimary: true,
			instrument: { select: { slug: true, name: true, family: true } }
		}
	},
	actor: {
		select: {
			genres: { select: { genre: { select: { id: true, name: true, parentId: true } } } }
		}
	}
} as const;

type SideRow = {
	actorId: string;
	instruments: {
		declaredLevel: number;
		isPrimary: boolean;
		instrument: { slug: string; name: string; family: string };
	}[];
	actor: { genres: { genre: { id: string; name: string; parentId: string | null } }[] };
};

function toSide(row: SideRow): MusicalSide {
	return {
		instruments: row.instruments.map((i) => ({
			slug: i.instrument.slug,
			name: i.instrument.name,
			family: i.instrument.family as InstrumentFamilyValue,
			level: i.declaredLevel,
			primary: i.isPrimary
		})),
		genres: row.actor.genres.map((g) => g.genre)
	};
}

const bandRank = (meters: number) => {
	const i = DISTANCE_BANDS.findIndex((b) => meters / 1000 < b.maxKm);
	return i === -1 ? DISTANCE_BANDS.length : i;
};

/**
 * Suggestions pour `viewerId`. `likeActorId` : « Dans le même style » que ce
 * profil (sa musique sert de référence, ma commune de centre ; ni lui ni moi
 * ne sommes suggérés).
 */
export async function suggestMusicians(
	viewerId: string,
	{ db, schema = schemaOf() }: Target,
	options: { likeActorId?: string; limit?: number; now?: Date } = {}
) {
	const now = options.now ?? new Date();
	const t = (name: string) => qualifiedTable(name, schema);
	const referenceId = options.likeActorId ?? viewerId;
	const [viewer, reference] = await Promise.all([
		db.person.findUnique({ where: { actorId: viewerId }, select: { birthDate: true } }),
		db.person.findUnique({ where: { actorId: referenceId }, select: SIDE_SELECT })
	]);
	if (!viewer || !reference) return [];
	const cutoff = adultBirthCutoff(now);
	// Date inconnue : prudence, on applique la règle des adultes.
	const viewerIsMinor = viewer.birthDate !== null && viewer.birthDate > cutoff;
	const excluded = [viewerId, referenceId];

	const rows = await db.$queryRaw<{ actorId: string; meters: number; inNetwork: boolean }[]>`
		SELECT r."actorId", r.meters, r."inNetwork" FROM (
			SELECT a.id AS "actorId", public.ST_Distance(me.point, other.point)::float8 AS meters,
				EXISTS (
					SELECT 1 FROM ${t('musical_ties')} mt
					WHERE mt."ownerId" = ${viewerId} AND mt."contactId" = a.id) AS "inNetwork",
				p."birthDate" AS "birthDate"
			FROM ${t('actor_locations')} me
			JOIN ${t('actor_locations')} other
				ON other."actorId" <> me."actorId"
				AND public.ST_DWithin(me.point, other.point, ${SUGGESTION_RADIUS_KM * 1000})
			JOIN ${t('actors')} a ON a.id = other."actorId"
			JOIN ${t('persons')} p ON p."actorId" = a.id
			WHERE me."actorId" = ${viewerId}
				AND a.id <> ALL(${excluded}::text[])
				AND a."deletedAt" IS NULL AND a.hidden = false
				AND p."onboardedAt" IS NOT NULL
				AND NOT EXISTS (
					SELECT 1 FROM ${t('blocks')} b
					WHERE (b."blockerActorId" = ${viewerId} AND b."blockedActorId" = a.id)
						OR (b."blockerActorId" = a.id AND b."blockedActorId" = ${viewerId}))
				AND NOT EXISTS (
					SELECT 1 FROM ${t('sanctions')} s
					WHERE s."actorId" = a.id AND s.kind::text = 'SUSPENSION' AND s."liftedAt" IS NULL
					AND (s.until IS NULL OR s.until > ${now}))
				AND NOT EXISTS (
					SELECT 1 FROM ${t('suggestion_dismissals')} sd
					WHERE sd."ownerId" = ${viewerId} AND sd."actorId" = a.id)
		) r
		WHERE ${viewerIsMinor} OR r."inNetwork" OR (r."birthDate" IS NOT NULL AND r."birthDate" <= ${cutoff})
		ORDER BY r.meters ASC, r."actorId" ASC
		LIMIT ${CANDIDATES}`;
	if (rows.length === 0) return [];

	const persons = await db.person.findMany({
		where: { actorId: { in: rows.map((r) => r.actorId) } },
		select: {
			...SIDE_SELECT,
			actor: {
				select: {
					handle: true,
					displayName: true,
					location: { select: { communeName: true } },
					genres: SIDE_SELECT.actor.select.genres
				}
			}
		}
	});
	const byId = new Map(persons.map((p) => [p.actorId, p]));
	const mine = toSide(reference);
	const ranked = rankSuggestions(
		rows.flatMap((r) => {
			const p = byId.get(r.actorId);
			if (!p) return [];
			return [
				{
					actorId: r.actorId,
					inNetwork: r.inNetwork,
					bandRank: bandRank(r.meters),
					meters: r.meters,
					compatibility: compatibility(mine, toSide(p)),
					person: p
				}
			];
		})
	);
	return ranked.slice(0, options.limit ?? SUGGESTION_COUNT).map((c) => ({
		handle: c.person.actor.handle,
		displayName: c.person.actor.displayName,
		commune: c.person.actor.location?.communeName ?? null,
		distance: distanceBand(c.meters),
		inNetwork: c.inNetwork,
		reason: reasonOf(c.compatibility),
		instruments: [...c.person.instruments]
			.sort(
				(a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.declaredLevel - a.declaredLevel
			)
			.slice(0, 2)
			.map((i) => ({ name: i.instrument.name, level: i.declaredLevel })),
		genres: c.person.actor.genres.slice(0, 3).map((g) => g.genre.name)
	}));
}

export type Suggestion = Awaited<ReturnType<typeof suggestMusicians>>[number];

/** « Pas intéressé·e » : la personne n'est plus suggérée (elle reste trouvable). */
export async function dismissSuggestion(db: PrismaClient, ownerId: string, handle: string) {
	const target = await db.actor.findUnique({ where: { handle }, select: { id: true } });
	if (!target || target.id === ownerId) return false;
	await db.suggestionDismissal.upsert({
		where: { ownerId_actorId: { ownerId, actorId: target.id } },
		create: { ownerId, actorId: target.id },
		update: {}
	});
	return true;
}
