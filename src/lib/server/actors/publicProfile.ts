/**
 * Profil public `/@handle` (P1-11). Ne renvoie que ce qui est public (D1) :
 * identité, profil musical, commune, médias publiés, palier, succès et
 * pastille de niveau, carte de réputation (P2-08). Jamais l'XP, le registre,
 * la date de naissance, la confiance, le score de réputation ni un point de
 * localisation.
 *
 * `null` si l'acteur n'existe pas ou n'est pas visible (anonymisé, masqué,
 * suspendu : `publicActorWhere`). L'appelant répond 404 sans dire pourquoi.
 */
import { prisma } from '#lib/server';
import { notIdeaDemo } from '#lib/server/works/visibility';
import { publicWorksOf } from '#lib/server/works/service';
import { bandsOfPerson, indexableBands } from '#lib/server/bands/public';
import { getMusicalProfile } from '#lib/prisma/skills/musicalProfile';
import { getActorLocation } from '#lib/server/geo/queries';
import { getMusicianTier, getProgress } from '#lib/server/progression/read';
import { adultBirthCutoff, isIndexable } from '#lib/actors/visibility';
import { endorsersByInstrument } from '#lib/server/endorsements/service';
import { getPublicReputation } from '#lib/server/progression/reputation';
import { getSoundProfile } from '#lib/prisma/crafts/soundProfile';
import { getProducerProfile } from '#lib/prisma/crafts/producerProfile';
import { getCraftTier, getSoundEngineerTier } from '#lib/server/progression/crafts';
import { publicActorWhere } from './visibility';
import { SOUND_ROLE_LABELS, type SoundRoleKind } from '#lib/works/rules';

const ENGINEER_ROLES: readonly SoundRoleKind[] = ['RECORDING', 'MIXING', 'MASTERING'];
const PRODUCER_ROLES: readonly SoundRoleKind[] = ['PRODUCTION'];

/**
 * Crédits confirmés d'une carte métier (P4-07) : les morceaux publics où la
 * personne a un rôle du son de ce métier. Un crédit en attente n'y est jamais.
 */
function craftCredits(
	works: { id: string; title: string; soundRoles: SoundRoleKind[] }[],
	kinds: readonly SoundRoleKind[]
) {
	return works.flatMap((w) => {
		const roles = w.soundRoles.filter((k) => kinds.includes(k));
		return roles.length > 0
			? [{ id: w.id, title: w.title, roles: roles.map((k) => SOUND_ROLE_LABELS[k]) }]
			: [];
	});
}

/** Médias publiés affichés sur le profil (les plus récents). */
export const PROFILE_MEDIA_LIMIT = 6;

/** `viewerId` : un blocage entre le lecteur et l'acteur rend le profil introuvable (P2-05). */
export async function getPublicProfile(handle: string, now = new Date(), viewerId?: string | null) {
	const actor = await prisma.actor.findFirst({
		// Personnes seulement : la page publique d'un groupe arrive avec P3-02.
		where: { handle, kind: 'PERSON', ...publicActorWhere(now, viewerId) },
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

	const hasTrack = (track: string) => actor.person?.tracks.some((t) => t.track === track) ?? false;
	const isSoundEngineer = hasTrack('SOUND_ENGINEER');
	const [
		musical,
		location,
		progress,
		tier,
		media,
		endorsed,
		reputation,
		bands,
		works,
		sound,
		producer
	] = await Promise.all([
		getMusicalProfile({ actorId: actor.id }),
		getActorLocation(actor.id),
		getProgress(actor.id, prisma),
		getMusicianTier(actor.id, prisma),
		prisma.media.findMany({
			where: { actorId: actor.id, status: 'PUBLISHED', ...notIdeaDemo },
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
		endorsersByInstrument(actor.id),
		getPublicReputation(actor.id, prisma),
		// Ses groupes actuels (P3-02).
		bandsOfPerson(actor.id, now, viewerId),
		// Morceaux composés, portés ou crédités (P3-11).
		publicWorksOf(actor.id, now, viewerId),
		// Profil d'ingé son (P4-02), déclaratif.
		isSoundEngineer
			? Promise.all([getSoundProfile(actor.id), getSoundEngineerTier(actor.id, prisma)])
			: null,
		// Profil de producteur·rice (P4-04), déclaratif.
		hasTrack('PRODUCER')
			? Promise.all([getProducerProfile(actor.id), getCraftTier(actor.id, 'PRODUCER', prisma)])
			: null
	]);

	const demosByInstrument = new Map<string, number>();
	for (const m of media) {
		if (m.isDemo && m.instrumentId) {
			demosByInstrument.set(m.instrumentId, (demosByInstrument.get(m.instrumentId) ?? 0) + 1);
		}
	}
	const person = actor.person;

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
		bands,
		works,
		// Rang d'ingé son (P4-02b) : des conditions, jamais l'XP.
		soundEngineer: sound?.[0]
			? { ...sound[0], tier: sound[1], credits: craftCredits(works, ENGINEER_ROLES) }
			: null,
		producer: producer?.[0]
			? { ...producer[0], tier: producer[1], credits: craftCredits(works, PRODUCER_ROLES) }
			: null,
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
		/**
		 * « Ce que d'autres confirment » (P2-08) : la carte de réputation, des
		 * faits et pas un score. Seule une réactivité flatteuse est montrée.
		 */
		confirmed: {
			collaborations: reputation.confirmedCollabs,
			distinctCollaborators: reputation.distinctCounterparts,
			corroboratedGigs: reputation.corroboratedGigs,
			verifiedReleases: reputation.verifiedReleases,
			distinctEndorsers: reputation.distinctEndorsers,
			bands: reputation.bands,
			respondsWithin:
				reputation.responseBucket === 'FAST'
					? ('24h' as const)
					: reputation.responseBucket === 'DAY'
						? ('48h' as const)
						: null,
			appreciations: reputation.endorsementsByKind
		}
	};
}

export type PublicProfile = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;

/** Acteurs indexables, pour le sitemap : visibles et majeurs. */
export async function indexableProfiles(now = new Date()) {
	const [persons, bands] = await Promise.all([
		prisma.actor.findMany({
			where: {
				...publicActorWhere(now),
				person: { birthDate: { lte: adultBirthCutoff(now) } }
			},
			select: { handle: true, updatedAt: true },
			orderBy: { handle: 'asc' }
		}),
		// Groupes formés et non dissous (P3-02).
		indexableBands(now)
	]);
	return [...persons, ...bands].sort((a, b) => a.handle.localeCompare(b.handle));
}
