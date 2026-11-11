/**
 * Annuaire des lieux (P2-14a, D27) : ajouter, chercher, lister autour de soi,
 * retirer (modération). Règles pures dans `#lib/venues/rules`.
 *
 * Un lieu n'a jamais d'adresse précise : on garde sa commune et le centre de
 * celle-ci aligné sur la grille (`fuzzedPointOf`), relu côté serveur à partir
 * du seul code INSEE envoyé par le navigateur.
 *
 * Validation (P2-14c, D26) : un lieu ajouté par un compte TL0 reste en
 * attente, visible de son seul auteur (et des membres TL1, pour le
 * confirmer) et sans jam, jusqu'à la confirmation d'un second membre TL1 ou
 * d'un modérateur (`validateVenue`, modération). Un SIRET vérifié (P2-14d,
 * D30) le valide tout de suite.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { qualifiedTable } from '#lib/server/db-schema';
import { RefillingTokenBucket } from '#lib/server/rate-limit';
import { getCommune } from '#lib/server/geo/communes';
import { fuzzedPointOf } from '#lib/geo/fuzz';
import { distanceBand } from '#lib/geo/distance';
import { getTrustLevel } from '#lib/server/trust/quotas';
import { VENUE_KIND_LABELS, venueNameKey, type VenueForm } from '#lib/venues/rules';
import type { BacklineItem } from '#lib/jam/lineup';
import { siretMismatch } from '#lib/venues/siret';
import { SiretLookupError, lookupEstablishment } from './establishments';
import { managesVenueOrg } from './claims';

/** Palier de confiance qui valide un lieu, à l'ajout ou en le confirmant. */
export const VALIDATING_TRUST_LEVEL = 1;

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
	claimedByActorId: true,
	backline: true,
	verifiedAt: true
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
		select: { id: true, removedAt: true, validatedAt: true, createdById: true }
	});
	if (existing) {
		if (existing.removedAt) throw new VenueError('Ce lieu a été retiré de l’annuaire.');
		if (!existing.validatedAt && existing.createdById === actorId) {
			throw new VenueError(
				'Tu as déjà proposé ce lieu : il attend une confirmation.',
				409,
				existing.id
			);
		}
		if (!existing.validatedAt) {
			// Seul un membre TL1 peut ouvrir la fiche pour la confirmer.
			const canConfirm = (await getTrustLevel(actorId)) >= VALIDATING_TRUST_LEVEL;
			throw new VenueError(
				canConfirm
					? 'Un autre membre vient de proposer ce lieu : tu peux le confirmer.'
					: 'Un autre membre vient de proposer ce lieu : il attend une confirmation.',
				409,
				canConfirm ? existing.id : null
			);
		}
		throw new VenueError('Ce lieu est déjà dans l’annuaire.', 409, existing.id);
	}
	const siret = form.siret ? await checkSiret(form.siret, commune.code, actorId) : null;
	if (!(await venueBucket.consume(actorId, 1))) {
		throw new VenueError(
			`Tu as déjà ajouté ${DAILY_VENUES} lieux aujourd’hui. Réessaie demain.`,
			429
		);
	}
	const { lat, lng } = fuzzedPointOf(commune);
	const trusted = (await getTrustLevel(actorId)) >= VALIDATING_TRUST_LEVEL;
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
				createdById: actorId,
				validatedAt: trusted || siret ? new Date() : null,
				siret,
				verifiedAt: siret ? new Date() : null
			},
			select: { id: true, validatedAt: true }
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

/**
 * Vérifie un SIRET pour un lieu de cette commune (D30) ; renvoie le SIRET,
 * ou lève une `VenueError` lisible.
 */
async function checkSiret(siret: string, communeCode: string, actorId: string) {
	let establishment;
	try {
		establishment = await lookupEstablishment(siret, actorId);
	} catch (err) {
		if (err instanceof SiretLookupError) throw new VenueError(err.message, 503);
		throw err;
	}
	if (!establishment) throw new VenueError('Aucun établissement ouvert avec ce SIRET.');
	const mismatch = siretMismatch(establishment, communeCode);
	if (mismatch) throw new VenueError(mismatch);
	const taken = await prisma.venue.findUnique({ where: { siret }, select: { id: true } });
	if (taken)
		throw new VenueError('Ce SIRET est déjà celui d’un lieu de l’annuaire.', 409, taken.id);
	return siret;
}

/**
 * Ajoute le SIRET d'un lieu (P2-14d, D30) : vérifié, le lieu est validé tout
 * de suite et porte le badge « vérifié ». Mêmes droits que le matériel.
 */
export async function verifyVenueSiret(id: string, actorId: string, siret: string) {
	const venue = await getVenue(id, actorId);
	if (!venue) throw new VenueError('Lieu introuvable.', 404);
	if (venue.verifiedAt) throw new VenueError('Ce lieu est déjà vérifié.');
	if (!venue.canEditBackline) throw new VenueError('Tu ne peux pas encore modifier ce lieu.', 403);
	await checkSiret(siret, venue.communeCode, actorId);
	const now = new Date();
	try {
		await prisma.venue.update({
			where: { id },
			data: { siret, verifiedAt: now, validatedAt: venue.validated ? undefined : now }
		});
	} catch (err) {
		if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
			throw new VenueError('Ce SIRET est déjà celui d’un lieu de l’annuaire.', 409);
		}
		throw err;
	}
}

/**
 * Lieu non retiré, vu par une personne, ou `null`. Un lieu en attente de
 * validation n'est vu que de son auteur et des membres qui peuvent le
 * confirmer. Seul un lieu validé (`validated`) accueille des jams.
 */
export async function getVenue(id: string, viewerId: string) {
	const venue = await prisma.venue.findFirst({
		where: { id, removedAt: null },
		select: {
			...venueSelect,
			communeCode: true,
			createdAt: true,
			createdById: true,
			validatedAt: true
		}
	});
	if (!venue) return null;
	const validated = venue.validatedAt !== null;
	const isCreator = venue.createdById === viewerId;
	const trusted = (await getTrustLevel(viewerId)) >= VALIDATING_TRUST_LEVEL;
	const canConfirm = !validated && !isCreator && trusted;
	if (!validated && !isCreator && !canConfirm) return null;
	// Matériel : la gestion du lieu qui a revendiqué sa fiche (P5-03a) ; sinon
	// son auteur ou un membre TL1 (comme on corrige une fiche collaborative).
	const canEditBackline = venue.claimedByActorId
		? await managesVenueOrg(venue.claimedByActorId, viewerId)
		: isCreator || trusted;
	return { ...card(venue), validated, isCreator, canConfirm, canEditBackline };
}

/**
 * Un second membre (TL1) confirme un lieu en attente : il devient visible de
 * tous et peut accueillir des jams. Sans XP.
 */
export async function confirmVenue(id: string, actorId: string) {
	const venue = await getVenue(id, actorId);
	if (!venue) throw new VenueError('Lieu introuvable.', 404);
	if (venue.validated) return;
	if (!venue.canConfirm) {
		throw new VenueError('Un autre membre doit confirmer ce lieu.', 403);
	}
	await prisma.venue.updateMany({
		where: { id, validatedAt: null },
		data: { validatedAt: new Date(), confirmedById: actorId }
	});
}

/** Lieux en attente ajoutés par la personne. */
export async function myPendingVenues(actorId: string): Promise<VenueCard[]> {
	const venues = await prisma.venue.findMany({
		where: { createdById: actorId, removedAt: null, validatedAt: null },
		orderBy: { createdAt: 'desc' },
		take: 20,
		select: venueSelect
	});
	return venues.map(card);
}

/** Matériel sur place d'un lieu (P2-14c), voir `canEditBackline`. */
export async function setVenueBackline(id: string, actorId: string, backline: BacklineItem[]) {
	const venue = await getVenue(id, actorId);
	if (!venue) throw new VenueError('Lieu introuvable.', 404);
	if (!venue.canEditBackline) throw new VenueError('Tu ne peux pas encore modifier ce lieu.', 403);
	await prisma.venue.update({ where: { id }, data: { backline } });
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
			validatedAt: { not: null },
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
	{
		radiusKm = 50,
		limit = 30,
		pending = false
	}: {
		radiusKm?: number;
		limit?: number;
		/** Lieux en attente d'un·e autre membre, à confirmer (TL1, P2-14c). */
		pending?: boolean;
	} = {}
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
			AND ${
				pending
					? Prisma.sql`v."validatedAt" IS NULL AND v."createdById" <> ${actorId}`
					: Prisma.sql`v."validatedAt" IS NOT NULL`
			}
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
