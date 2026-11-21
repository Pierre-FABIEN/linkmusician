/**
 * Recherche de musicien·nes (P2-01) : une requête PostGIS (rayon autour de
 * la commune de la personne qui cherche, filtres de profil), puis lecture
 * des fiches. Seuls les profils publics sont trouvables (`publicActorWhere`
 * en SQL : ni anonymisé, ni masqué, ni suspendu), et jamais une personne
 * séparée de moi par un blocage, dans un sens ou dans l'autre (P2-05). Tri
 * (D33) : son réseau musical d'abord (P2-16), puis par tranche de distance
 * affichée, puis, dans une même tranche, par réputation (score interne de
 * P2-08, qui ne sort jamais de la requête SQL), enfin par distance. Jamais
 * l'XP.
 *
 * La distance exacte ne sort jamais d'ici : seulement sa tranche
 * (`distanceBand`). D'où une pagination par numéro de page, pas par curseur
 * (un curseur porterait la distance).
 *
 * Par métier (ONB-13a, D62) : une offre cochée dans ce métier (« Je
 * propose »), jamais la seule spécialité ; bloc « spécialités et intentions »
 * non privé (D61) ; « à distance » lit `CraftMobility`, sans limite de rayon.
 *
 * Imports relatifs : utilisé aussi par le test d'intégration, hors SvelteKit.
 */
import { Prisma, type PrismaClient } from '@prisma/client';
import { DISTANCE_BANDS, distanceBand } from '../../geo/distance';
import { offersOf, PAGE_SIZE, type SearchFilters } from '../../search/filters';
import { qualifiedTable, schemaOf } from '../db-schema';

/** Rayon de déplacement supposé quand la personne n'en a pas indiqué. */
export const DEFAULT_TRAVEL_KM = 25;

type Target = { db: PrismaClient; schema?: string };

/**
 * Rang de la tranche de distance affichée (`distanceBand`), en SQL. Constantes
 * du code en littéraux (pas de paramètres non typés dans un `CASE`).
 */
const bandRank = (meters: Prisma.Sql) =>
	Prisma.sql`CASE ${Prisma.join(
		DISTANCE_BANDS.map(
			(b, i) =>
				Prisma.sql`WHEN ${meters} < ${Prisma.raw(String(b.maxKm * 1000))} THEN ${Prisma.raw(String(i))}`
		),
		' '
	)} ELSE ${Prisma.raw(String(DISTANCE_BANDS.length))} END`;

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
	if (filters.track) {
		// Le métier, avec son bloc « spécialités et intentions » visible des
		// membres (D61) ; « pas de sollicitations en ce moment » l'écarte, une
		// réponse non précisée non (Q66).
		conditions.push(Prisma.sql`EXISTS (
			SELECT 1 FROM ${t('person_tracks')} pt
			WHERE pt."personId" = a.id AND pt.track::text = ${filters.track}
				AND pt."offersVisibility"::text <> 'PRIVATE'
				AND pt."openToRequests" IS DISTINCT FROM false)`);
	}
	if (filters.track && filters.track !== 'MUSICIAN') {
		// D62 : une spécialité ne vaut pas une prestation. On n'est trouvé·e
		// comme prestataire qu'avec une offre cochée dans ce métier.
		conditions.push(Prisma.sql`EXISTS (
			SELECT 1 FROM ${t('person_track_intents')} pti
			WHERE pti."personId" = a.id AND pti.track::text = ${filters.track}
				AND pti.direction::text = 'OFFER'
				${filters.offer ? Prisma.sql`AND pti.code = ${filters.offer}` : Prisma.empty})`);
	} else if (filters.track === 'MUSICIAN' && filters.offer) {
		conditions.push(Prisma.sql`EXISTS (
			SELECT 1 FROM ${t('person_track_intents')} pti
			WHERE pti."personId" = a.id AND pti.track::text = 'MUSICIAN'
				AND pti.direction::text = 'OFFER' AND pti.code = ${filters.offer})`);
	}
	if (filters.track && filters.specialty) {
		// Spécialités par métier (ONB-01) : les codes historiques y sont recopiés.
		conditions.push(Prisma.sql`EXISTS (
			SELECT 1 FROM ${t('person_track_specializations')} pts
			WHERE pts."personId" = a.id AND pts.track::text = ${filters.track}
				AND pts.code = ${filters.specialty})`);
	}
	if (filters.remote) {
		// « À distance » (D62) : la mobilité déclarée du métier, sans limite de rayon.
		const profile =
			filters.track === 'PRODUCER' ? t('producer_profiles') : t('sound_engineer_profiles');
		conditions.push(Prisma.sql`EXISTS (
			SELECT 1 FROM ${profile} cp
			WHERE cp."personId" = a.id AND 'REMOTE' = ANY(cp.mobility::text[]))`);
	}
	if (filters.references && filters.track) {
		conditions.push(Prisma.sql`EXISTS (
			SELECT 1 FROM ${t('craft_references')} cr
			WHERE cr."personId" = a.id AND cr.track::text = ${filters.track})`);
	}
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
		// Styles joués, produits (P4-04), programmés (P5-05a) ou suivis (P5-07).
		conditions.push(Prisma.sql`EXISTS (
			SELECT 1 FROM (
				SELECT ag."genreId" FROM ${t('actor_genres')} ag WHERE ag."actorId" = a.id
				UNION ALL
				SELECT pg."genreId" FROM ${t('producer_genres')} pg WHERE pg."personId" = a.id
				UNION ALL
				SELECT og."genreId" FROM ${t('promoter_genres')} og WHERE og."personId" = a.id
				UNION ALL
				SELECT mg."genreId" FROM ${t('agent_genres')} mg WHERE mg."personId" = a.id
			) mine JOIN ${t('genres')} g ON g.id = mine."genreId"
			LEFT JOIN ${t('genres')} parent ON parent.id = g."parentId"
			WHERE g.slug = ${filters.genre} OR parent.slug = ${filters.genre})`);
	}
	if (filters.lookingFor) {
		// `lookingFor` copie le « Je recherche » musicien·ne (D58) : il suit la
		// visibilité de ce bloc (D61).
		conditions.push(Prisma.sql`${filters.lookingFor} = ANY(p."lookingFor"::text[])
			AND NOT EXISTS (
				SELECT 1 FROM ${t('person_tracks')} mpt
				WHERE mpt."personId" = a.id AND mpt.track::text = 'MUSICIAN'
					AND mpt."offersVisibility"::text = 'PRIVATE')`);
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

	// Le score de réputation ne sert qu'à ordonner : il reste dans la
	// sous-requête et n'est jamais sélectionné (P2-08).
	const rows = await db.$queryRaw<{ actorId: string; meters: number; inNetwork: boolean }[]>`
		SELECT r."actorId", r.meters, r."inNetwork" FROM (
			SELECT a.id AS "actorId", public.ST_Distance(me.point, other.point)::float8 AS meters,
				EXISTS (
					SELECT 1 FROM ${t('saved_contacts')} mt
					WHERE mt."ownerId" = ${searcherId} AND mt."contactId" = a.id) AS "inNetwork",
				COALESCE(rs."internalScore", 0) AS rank_score
			FROM ${t('actor_locations')} me
			JOIN ${t('actor_locations')} other
				ON other."actorId" <> me."actorId"
				AND ${filters.remote ? Prisma.sql`TRUE` : Prisma.sql`public.ST_DWithin(me.point, other.point, ${radiusM})`}
			JOIN ${t('actors')} a ON a.id = other."actorId"
			JOIN ${t('persons')} p ON p."actorId" = a.id
			LEFT JOIN ${t('reputation_snapshots')} rs ON rs."actorId" = a.id
			WHERE me."actorId" = ${searcherId}
				AND a."deletedAt" IS NULL AND a.hidden = false
				AND p."onboardedAt" IS NOT NULL
				AND NOT EXISTS (
					SELECT 1 FROM ${t('blocks')} b
					WHERE (b."blockerActorId" = ${searcherId} AND b."blockedActorId" = a.id)
						OR (b."blockerActorId" = a.id AND b."blockedActorId" = ${searcherId}))
				AND NOT EXISTS (
					SELECT 1 FROM ${t('sanctions')} s
					WHERE s."actorId" = a.id AND s.kind::text = 'SUSPENSION' AND s."liftedAt" IS NULL
					AND (s.until IS NULL OR s.until > ${now}))
				${extra}
		) r
		ORDER BY r."inNetwork" DESC, ${bandRank(Prisma.sql`r.meters`)} ASC, r.rank_score DESC,
			r.meters ASC, r."actorId" ASC
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
			soundProfile: { select: { specialties: true } },
			producerProfile: { select: { specialties: true } },
			promoterProfile: { select: { eventKinds: true } },
			// Manager, booker (P5-07).
			agentProfile: {
				select: { genres: { take: 3, select: { genre: { select: { name: true } } } } }
			},
			tracks: {
				select: {
					track: true,
					offersVisibility: true,
					// « Je propose » (ONB-13a) : affiché pour le métier cherché seulement.
					intents: { where: { direction: 'OFFER' }, select: { code: true } }
				}
			},
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
		const musicianPrivate = p.tracks.some(
			(t) => t.track === 'MUSICIAN' && t.offersVisibility === 'PRIVATE'
		);
		// Spécialités historiques (ONB-12c2, D61, Q70) : bloc des intentions de leur
		// métier ; la recherche est réservée aux membres, seul « privé » les masque.
		const offersShown = (track: string) =>
			p.tracks.some((t) => t.track === track && t.offersVisibility !== 'PRIVATE');
		const offerCodes =
			p.tracks.find((t) => t.track === filters.track)?.intents.map((i) => i.code) ?? [];
		return [
			{
				handle: p.actor.handle,
				displayName: p.actor.displayName,
				commune: p.actor.location?.communeName ?? null,
				distance: distanceBand(hit.meters),
				inNetwork: hit.inNetwork,
				instruments: p.instruments.map((i) => ({
					name: i.instrument.name,
					level: i.declaredLevel
				})),
				genres: p.actor.genres.map((g) => g.genre.name),
				proStatus: p.proStatus,
				// Copie du « Je recherche » musicien·ne (D58) : suit sa visibilité (D61).
				lookingFor: musicianPrivate ? [] : p.lookingFor,
				/** Ce que la personne propose dans le métier cherché (D62), libellés. */
				offers: filters.track
					? offersOf(filters.track)
							.filter((o) => offerCodes.includes(o.code))
							.map((o) => o.label)
					: [],
				/** Spécialités d'ingé son déclarées (P4-02), vides sinon. */
				soundSpecialties: offersShown('SOUND_ENGINEER') ? (p.soundProfile?.specialties ?? []) : [],
				/** Spécialités de producteur·rice déclarées (P4-04), vides sinon. */
				producerSpecialties: offersShown('PRODUCER') ? (p.producerProfile?.specialties ?? []) : [],
				/** Ce que la personne organise (P5-05a), vide sinon. */
				promoterEventKinds: offersShown('PROMOTER') ? (p.promoterProfile?.eventKinds ?? []) : [],
				/** Manager ou booker (P5-07), avec les genres suivis ; vide sans fiche. */
				agent: p.agentProfile?.genres.length
					? {
							kinds: p.tracks
								.map((t) => t.track)
								.filter((t): t is 'MANAGER' | 'BOOKER' => t === 'MANAGER' || t === 'BOOKER'),
							genres: p.agentProfile.genres.map((g) => g.genre.name)
						}
					: null
			}
		];
	});
	return { results, hasMore };
}

export type MusicianResult = Awaited<ReturnType<typeof searchMusicians>>['results'][number];
