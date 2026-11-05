/**
 * Annuaire des lieux (P2-14a, D27) : ajouter, chercher, lister autour de soi,
 * retirer (modération). Règles pures dans `#lib/venues/rules`.
 *
 * Un lieu n'a jamais d'adresse précise : on garde sa commune et le centre de
 * celle-ci aligné sur la grille (`fuzzedPointOf`), relu côté serveur à partir
 * du seul code INSEE envoyé par le navigateur.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { qualifiedTable } from '#lib/server/db-schema';
import { RefillingTokenBucket } from '#lib/server/rate-limit';
import { getCommune } from '#lib/server/geo/communes';
import { fuzzedPointOf } from '#lib/geo/fuzz';
import { distanceBand } from '#lib/geo/distance';
import { VENUE_KIND_LABELS, venueNameKey, type VenueForm } from '#lib/venues/rules';

export class VenueError extends Error {
	constructor(
		message: string,
		readonly status = 400,
		/** Lieu déjà présent dans l'annuaire (doublon). */
		readonly existingId: string | null = null
	) {
		super(message);
	}
}

/** Lieux ajoutés par personne et par jour. */
export const DAILY_VENUES = 5;
const venueBucket = new RefillingTokenBucket<string>(
	DAILY_VENUES,
	Math.ceil(86400 / DAILY_VENUES),
	'venues'
);

const venueSelect = {
	id: true,
	name: true,
	kind: true,
	communeName: true,
	departmentCode: true,
	claimedByActorId: true
} satisfies Prisma.VenueSelect;

export type VenueCard = Prisma.VenueGetPayload<{ select: typeof venueSelect }> & {
	kindLabel: string;
	distance?: string;
};

const card = <T extends { kind: keyof typeof VENUE_KIND_LABELS }>(v: T) => ({
	...v,
	kindLabel: VENUE_KIND_LABELS[v.kind]
});

export async function createVenue(actorId: string, form: VenueForm) {
	const commune = await getCommune(form.communeCode);
	if (!commune) throw new VenueError('Commune inconnue.');
	const nameKey = venueNameKey(form.name);
	const existing = await prisma.venue.findUnique({
		where: { communeCode_nameKey: { communeCode: commune.code, nameKey } },
		select: { id: true, removedAt: true }
	});
	if (existing) {
		if (existing.removedAt) throw new VenueError('Ce lieu a été retiré de l’annuaire.');
		throw new VenueError('Ce lieu est déjà dans l’annuaire.', 409, existing.id);
	}
	if (!(await venueBucket.consume(actorId, 1))) {
		throw new VenueError(
			`Tu as déjà ajouté ${DAILY_VENUES} lieux aujourd’hui. Réessaie demain.`,
			429
		);
	}
	const { lat, lng } = fuzzedPointOf(commune);
	try {
		return await prisma.venue.create({
			data: {
				name: form.name,
				nameKey,
				kind: form.kind,
				communeCode: commune.code,
				communeName: commune.nom,
				departmentCode: commune.codeDepartement,
				lat,
				lng,
				createdById: actorId
			},
			select: { id: true }
		});
	} catch (err) {
		// Ajout simultané du même lieu.
		if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
			const twin = await prisma.venue.findUnique({
				where: { communeCode_nameKey: { communeCode: commune.code, nameKey } },
				select: { id: true }
			});
			throw new VenueError('Ce lieu est déjà dans l’annuaire.', 409, twin?.id ?? null);
		}
		throw err;
	}
}

/** Lieu visible (non retiré), ou `null`. */
export async function getVenue(id: string) {
	const venue = await prisma.venue.findFirst({
		where: { id, removedAt: null },
		select: { ...venueSelect, communeCode: true, createdAt: true }
	});
	return venue ? card(venue) : null;
}

/** Recherche par nom (et commune, facultative). */
export async function searchVenues(
	query: string,
	{ communeCode, limit = 20 }: { communeCode?: string; limit?: number } = {}
): Promise<VenueCard[]> {
	const key = venueNameKey(query);
	if (key.length < 2) return [];
	const venues = await prisma.venue.findMany({
		where: {
			removedAt: null,
			nameKey: { contains: key },
			...(communeCode ? { communeCode } : {})
		},
		orderBy: { name: 'asc' },
		take: limit,
		select: venueSelect
	});
	return venues.map(card);
}

/**
 * Lieux autour d'un acteur (sa commune floutée), du plus proche au plus
 * lointain. La distance n'est montrée que par tranches.
 */
export async function venuesNear(
	actorId: string,
	{ radiusKm = 50, limit = 30 }: { radiusKm?: number; limit?: number } = {}
): Promise<VenueCard[]> {
	const locations = qualifiedTable('actor_locations');
	const venues = qualifiedTable('venues');
	const rows = await prisma.$queryRaw<{ id: string; meters: number }[]>`
		SELECT v."id",
			public.ST_Distance(
				me."point",
				public.ST_SetSRID(public.ST_MakePoint(v."lng", v."lat"), 4326)::public.geography
			)::float8 AS meters
		FROM ${locations} me
		JOIN ${venues} v ON v."removedAt" IS NULL
			AND public.ST_DWithin(
				me."point",
				public.ST_SetSRID(public.ST_MakePoint(v."lng", v."lat"), 4326)::public.geography,
				${radiusKm * 1000}
			)
		WHERE me."actorId" = ${actorId}
		ORDER BY meters ASC, v."name" ASC
		LIMIT ${limit}`;
	if (rows.length === 0) return [];
	const found = await prisma.venue.findMany({
		where: { id: { in: rows.map((r) => r.id) } },
		select: venueSelect
	});
	const byId = new Map(found.map((v) => [v.id, v]));
	return rows.flatMap((r) => {
		const v = byId.get(r.id);
		return v ? [{ ...card(v), distance: distanceBand(r.meters) }] : [];
	});
}
