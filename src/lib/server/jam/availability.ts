/**
 * Mode jam, « Je suis dispo » (P2-13) : une disponibilité par personne,
 * visible des musicien·nes autour, éteinte seule à la fin du créneau.
 * Mineur·es (D5, D26) : jamais affichée, donc pas proposée.
 */
import { prisma } from '#lib/server';
import { qualifiedTable } from '#lib/server/db-schema';
import { RefillingTokenBucket } from '#lib/server/rate-limit';
import { adultBirthCutoff, isIndexable } from '#lib/actors/visibility';
import { distanceBand } from '#lib/geo/distance';
import { cleanNote, slotWindow, type AvailabilitySlotValue } from '#lib/jam/availability';

export class AvailabilityError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

/** 5 activations d'affilée, puis une toutes les ~5 h : pas de « spam » de présence. */
const toggleBucket = new RefillingTokenBucket<string>(5, 5 * 60 * 60, 'jam-availability');

/** Rayon par défaut quand la personne n'a pas indiqué de rayon de déplacement. */
const DEFAULT_RADIUS_KM = 25;

export async function canBeAvailable(actorId: string): Promise<boolean> {
	const person = await prisma.person.findUnique({
		where: { actorId },
		select: { birthDate: true }
	});
	return isIndexable(person?.birthDate);
}

export async function setAvailability(
	actorId: string,
	slot: AvailabilitySlotValue,
	rawNote: string,
	now = new Date()
) {
	if (!(await canBeAvailable(actorId))) {
		throw new AvailabilityError('Cette option n’est pas disponible pour ton compte.', 403);
	}
	if (!(await toggleBucket.consume(actorId, 1))) {
		throw new AvailabilityError(
			'Tu as changé ta disponibilité plusieurs fois : réessaie plus tard.',
			429
		);
	}
	const { startsAt, endsAt } = slotWindow(slot, now);
	const data = { slot, startsAt, endsAt, note: cleanNote(rawNote) };
	await prisma.availability.upsert({
		where: { actorId },
		create: { actorId, ...data },
		update: { ...data, createdAt: now }
	});
}

export async function clearAvailability(actorId: string) {
	await prisma.availability.deleteMany({ where: { actorId } });
}

/** Ma disponibilité en cours, ou `null` (une disponibilité échue ne compte plus). */
export async function myAvailability(actorId: string, now = new Date()) {
	return prisma.availability.findFirst({
		where: { actorId, endsAt: { gt: now } },
		select: { slot: true, startsAt: true, endsAt: true, note: true }
	});
}

/**
 * Musicien·nes dispos autour de moi (mon rayon de déplacement, 25 km par
 * défaut), les plus tôt dispos puis les plus proches. Jamais un·e mineur·e,
 * ni un profil masqué, suspendu, ou séparé de moi par un blocage.
 */
export async function listAvailableNearby(viewerId: string, now = new Date()) {
	const t = (name: string) => qualifiedTable(name);
	const viewer = await prisma.person.findUnique({
		where: { actorId: viewerId },
		select: { travelRadiusKm: true }
	});
	const radiusM = (viewer?.travelRadiusKm ?? DEFAULT_RADIUS_KM) * 1000;
	const rows = await prisma.$queryRaw<{ actorId: string; meters: number }[]>`
		SELECT av."actorId", public.ST_Distance(me.point, loc.point)::float8 AS meters
		FROM ${t('availabilities')} av
		JOIN ${t('actors')} a ON a.id = av."actorId"
		JOIN ${t('persons')} p ON p."actorId" = a.id
		JOIN ${t('actor_locations')} loc ON loc."actorId" = a.id
		JOIN ${t('actor_locations')} me ON me."actorId" = ${viewerId}
		WHERE av."endsAt" > ${now} AND a.id <> ${viewerId}
			AND public.ST_DWithin(me.point, loc.point, ${radiusM})
			AND a."deletedAt" IS NULL AND a.hidden = false
			AND p."birthDate" IS NOT NULL AND p."birthDate" <= ${adultBirthCutoff(now)}
			AND NOT EXISTS (
				SELECT 1 FROM ${t('blocks')} b
				WHERE (b."blockerActorId" = ${viewerId} AND b."blockedActorId" = a.id)
					OR (b."blockerActorId" = a.id AND b."blockedActorId" = ${viewerId}))
			AND NOT EXISTS (
				SELECT 1 FROM ${t('sanctions')} s
				WHERE s."actorId" = a.id AND s.kind::text = 'SUSPENSION' AND s."liftedAt" IS NULL
				AND (s.until IS NULL OR s.until > ${now}))
		ORDER BY av."startsAt" ASC, meters ASC
		LIMIT 50`;
	if (rows.length === 0) return [];
	const meters = new Map(rows.map((r) => [r.actorId, r.meters]));
	const people = await prisma.availability.findMany({
		where: { actorId: { in: rows.map((r) => r.actorId) } },
		select: {
			actorId: true,
			slot: true,
			startsAt: true,
			note: true,
			actor: {
				select: {
					handle: true,
					displayName: true,
					location: { select: { communeName: true } },
					person: {
						select: {
							instruments: {
								orderBy: [{ isPrimary: 'desc' }],
								take: 2,
								select: { instrument: { select: { name: true } } }
							}
						}
					}
				}
			}
		}
	});
	const byId = new Map(people.map((p) => [p.actorId, p]));
	return rows.flatMap((r) => {
		const p = byId.get(r.actorId);
		if (!p) return [];
		return [
			{
				handle: p.actor.handle,
				displayName: p.actor.displayName,
				slot: p.slot as AvailabilitySlotValue,
				note: p.note,
				instruments: (p.actor.person?.instruments ?? []).map((i) => i.instrument.name),
				commune: p.actor.location?.communeName ?? null,
				distance: distanceBand(meters.get(r.actorId) ?? 0)
			}
		];
	});
}

/** Nettoyage quotidien des disponibilités échues. */
export async function clearExpiredAvailabilities(now = new Date()) {
	const { count } = await prisma.availability.deleteMany({ where: { endsAt: { lte: now } } });
	return count;
}
