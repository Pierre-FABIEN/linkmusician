/**
 * Carnet de jams (P2-16) : les jams où l'on était (« J'y étais », sans
 * retrait par l'hôte), façon souvenirs : lieu, style, ce que l'on a joué,
 * les personnes rencontrées et leurs instruments, les appréciations reçues.
 * Privé : seule la personne voit son carnet.
 */
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { JAM_QUALITY_LABELS } from '#lib/jam/afterJam';
import { logStats } from '#lib/jam/log';
import { networkIdsOf } from '#lib/server/network/service';

const present = { attendedAt: { not: null }, removedAt: null } as const;

export async function jamLog(actorId: string, now = new Date()) {
	const mine = await prisma.jamAttendance.findMany({
		where: { actorId, ...present },
		orderBy: { opportunity: { startsAt: 'desc' } },
		take: 100,
		select: {
			instrument: { select: { name: true } },
			opportunity: {
				select: {
					id: true,
					title: true,
					startsAt: true,
					genreSlug: true,
					venue: { select: { name: true, communeName: true } },
					attendances: {
						where: { actorId: { not: actorId }, ...present, actor: publicActorWhere(now, actorId) },
						select: {
							actorId: true,
							instrument: { select: { name: true } },
							actor: { select: { handle: true, displayName: true } }
						}
					},
					endorsements: {
						where: { toActorId: actorId, revokedAt: null },
						select: { quality: true, instrument: { select: { name: true } } }
					}
				}
			}
		}
	});
	const [genres, network] = await Promise.all([
		prisma.genre.findMany({
			where: { slug: { in: mine.flatMap((m) => m.opportunity.genreSlug ?? []) } },
			select: { slug: true, name: true }
		}),
		networkIdsOf(actorId)
	]);
	const genreName = new Map(genres.map((g) => [g.slug, g.name]));
	const entries = mine.map(({ instrument, opportunity: j }) => ({
		jamId: j.id,
		title: j.title,
		startsAt: j.startsAt!,
		venue: j.venue?.name ?? '',
		communeName: j.venue?.communeName ?? '',
		genre: j.genreSlug ? (genreName.get(j.genreSlug) ?? null) : null,
		played: instrument?.name ?? null,
		others: j.attendances.map((a) => ({
			handle: a.actor.handle,
			displayName: a.actor.displayName,
			instrument: a.instrument?.name ?? null,
			inNetwork: network.has(a.actorId)
		})),
		appreciations: j.endorsements.map((e) =>
			e.quality ? JAM_QUALITY_LABELS[e.quality] : (e.instrument?.name.toLowerCase() ?? '')
		)
	}));
	return { entries, stats: logStats(entries) };
}
