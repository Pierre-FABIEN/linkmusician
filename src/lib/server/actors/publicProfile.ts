/**
 * Profil public `/@handle` (P1-11). Ne renvoie que ce qui est public (D1) :
 * identité, profil musical, commune, médias publiés, palier, succès et
 * pastille de niveau. Jamais l'XP, le registre, la date de naissance, la
 * confiance ni un point de localisation.
 *
 * `null` si l'acteur n'existe pas ou n'est pas visible (anonymisé, masqué,
 * suspendu : `publicActorWhere`). L'appelant répond 404 sans dire pourquoi.
 */
import { prisma } from '#lib/server';
import { getMusicalProfile } from '#lib/prisma/skills/musicalProfile';
import { getActorLocation } from '#lib/server/geo/queries';
import { getMusicianTier, getProgress } from '#lib/server/progression/read';
import { adultBirthCutoff, isIndexable } from '#lib/actors/visibility';
import { endorsersByInstrument } from '#lib/server/endorsements/service';
import { publicActorWhere } from './visibility';

/** Médias publiés affichés sur le profil (les plus récents). */
export const PROFILE_MEDIA_LIMIT = 6;

/** `viewerId` : un blocage entre le lecteur et l'acteur rend le profil introuvable (P2-05). */
export async function getPublicProfile(handle: string, now = new Date(), viewerId?: string | null) {
	const actor = await prisma.actor.findFirst({
		where: { handle, ...publicActorWhere(now, viewerId) },
		select: {
			id: true,
			kind: true,
			handle: true,
			displayName: true,
			bio: true,
			updatedAt: true,
			person: {
				select: {
					birthDate: true,
					proStatus: true,
					lookingFor: true,
					practiceSince: true,
					tracks: { select: { track: true, isPrimary: true } },
					links: { select: { kind: true, url: true } }
				}
			}
		}
	});
	if (!actor) return null;

	const [musical, location, progress, tier, media, endorsed] = await Promise.all([
		getMusicalProfile({ actorId: actor.id }),
		getActorLocation(actor.id),
		getProgress(actor.id, prisma),
		getMusicianTier(actor.id, prisma),
		prisma.media.findMany({
			where: { actorId: actor.id, status: 'PUBLISHED' },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				title: true,
				kind: true,
				isDemo: true,
				externalUrl: true,
				fileUrl: true,
				instrumentId: true
			}
		}),
		endorsersByInstrument(actor.id)
	]);

	const demosByInstrument = new Map<string, number>();
	for (const m of media) {
		if (m.isDemo && m.instrumentId) {
			demosByInstrument.set(m.instrumentId, (demosByInstrument.get(m.instrumentId) ?? 0) + 1);
		}
	}
	const person = actor.person;
	const s = tier.summary;

	return {
		id: actor.id,
		kind: actor.kind,
		handle: actor.handle,
		displayName: actor.displayName,
		bio: actor.bio,
		updatedAt: actor.updatedAt,
		indexable: isIndexable(person?.birthDate, now),
		tracks: [...(person?.tracks ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
		proStatus: person?.proStatus ?? null,
		practiceSince: person?.practiceSince ?? null,
		lookingFor: person?.lookingFor ?? [],
		links: person?.links ?? [],
		commune: location?.communeName ?? null,
		instruments: musical.instruments.map((i) => ({
			name: i.name,
			level: i.level,
			primary: i.isPrimary,
			demos: demosByInstrument.get(i.instrumentId) ?? 0,
			// « Endossé par N » (P2-07) : personnes distinctes, jams et collaborations.
			endorsements: endorsed.get(i.instrumentId) ?? 0
		})),
		genres: musical.genres.map((g) => g.name),
		influences: musical.influences,
		media: media.slice(0, PROFILE_MEDIA_LIMIT).map(({ instrumentId: _i, ...m }) => m),
		mediaCount: media.length,
		level: progress.level,
		tier: tier.tier,
		achievements: progress.achievements.map((a) => ({
			id: a.id,
			name: a.name,
			description: a.description,
			unlockedAt: a.unlockedAt
		})),
		/** « Ce que d'autres confirment » : des faits, pas un score. */
		confirmed: {
			collaborations: s.collaborations,
			distinctCollaborators: s.distinctCollaborators,
			corroboratedGigs: s.corroboratedGigs,
			distinctEndorsers: s.distinctEndorsers,
			bands: s.bands
		}
	};
}

export type PublicProfile = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;

/** Acteurs indexables, pour le sitemap : visibles et majeurs. */
export async function indexableProfiles(now = new Date()) {
	return prisma.actor.findMany({
		where: {
			...publicActorWhere(now),
			person: { birthDate: { lte: adultBirthCutoff(now) } }
		},
		select: { handle: true, updatedAt: true },
		orderBy: { handle: 'asc' }
	});
}
