/**
 * Jams publiques (P2-14b, D26, D27) : publier une jam dans un lieu de
 * l'annuaire, lister les jams à venir autour de soi, « Je viens ».
 *
 * Une jam est une annonce `JAM` avec un lieu, un début et une fin. Elle ne
 * rapporte aucune XP : ni à la publication, ni pour « Je viens » (D27).
 * Mineur·es (D5) : ils ne voient, ne rejoignent et ne publient que des jams
 * finies le jour même avant 22 h.
 */
import { prisma } from '#lib/server';
import { isIndexable } from '#lib/actors/visibility';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { checkStockQuota } from '#lib/server/trust/quotas';
import { getVenue, venuesNear } from '#lib/server/venues/service';
import { checkJamWindow, endsBeforeCurfew, type JamForm } from '#lib/jam/publicJam';

export class JamError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

async function isAdult(actorId: string) {
	const person = await prisma.person.findUnique({
		where: { actorId },
		select: { birthDate: true }
	});
	return isIndexable(person?.birthDate);
}

export async function createJam(actorId: string, form: JamForm, now = new Date()) {
	const window = checkJamWindow(form, now);
	if (!window.ok) throw new JamError(window.error);
	const { startsAt, endsAt } = window;
	if (!(await isAdult(actorId)) && !endsBeforeCurfew(startsAt, endsAt)) {
		throw new JamError('Ta jam doit finir avant 22 h.');
	}
	const venue = await getVenue(form.venueId);
	if (!venue) throw new JamError('Choisis un lieu de l’annuaire.');
	const active = await prisma.opportunity.count({
		where: { issuerActorId: actorId, status: 'OPEN', expiresAt: { gt: now } }
	});
	const quota = await checkStockQuota(actorId, 'activeOpportunities', active);
	if (!quota.allowed) {
		throw new JamError(
			`Tu as déjà ${quota.limit} annonce${quota.limit > 1 ? 's' : ''} ou jam${quota.limit > 1 ? 's' : ''} en cours.`,
			429
		);
	}
	const [instruments, genre] = await Promise.all([
		prisma.instrument.findMany({
			where: { slug: { in: form.spots.map((s) => s.instrument) }, active: true },
			select: { id: true, slug: true }
		}),
		form.genre ? prisma.genre.findFirst({ where: { slug: form.genre, active: true } }) : null
	]);
	if (instruments.length !== form.spots.length) throw new JamError('Instrument inconnu.');
	if (form.genre && !genre) throw new JamError('Genre inconnu.');
	const idOf = new Map(instruments.map((i) => [i.slug, i.id]));
	return prisma.opportunity.create({
		data: {
			issuerActorId: actorId,
			kind: 'JAM',
			title: form.title,
			description: form.description,
			genreSlug: genre?.slug ?? null,
			startsAt,
			endsAt,
			venueId: venue.id,
			expiresAt: endsAt,
			slots: Math.max(
				1,
				form.spots.reduce((n, s) => n + s.count, 0)
			),
			jamSpots: {
				create: form.spots.map((s) => ({ instrumentId: idOf.get(s.instrument)!, count: s.count }))
			}
		},
		select: { id: true }
	});
}

const jamInclude = (viewerId: string) =>
	({
		venue: { select: { id: true, name: true, communeName: true, kind: true } },
		issuer: { select: { handle: true, displayName: true } },
		jamSpots: { select: { count: true, instrument: { select: { name: true } } } },
		_count: { select: { attendances: true } },
		attendances: { where: { actorId: viewerId }, select: { actorId: true } }
	}) as const;

type JamRow = Awaited<ReturnType<typeof findJams>>[number];

function findJams(viewerId: string, where: object, now: Date, take = 30) {
	return prisma.opportunity.findMany({
		where: {
			kind: 'JAM',
			status: 'OPEN',
			venueId: { not: null },
			venue: { removedAt: null },
			endsAt: { gt: now },
			issuer: publicActorWhere(now, viewerId),
			...where
		},
		orderBy: { startsAt: 'asc' },
		take,
		include: jamInclude(viewerId)
	});
}

function toCard(j: JamRow, viewerId: string) {
	return {
		id: j.id,
		title: j.title,
		startsAt: j.startsAt!,
		endsAt: j.endsAt!,
		venue: j.venue!,
		host: j.issuer,
		isHost: j.issuerActorId === viewerId,
		spots: j.jamSpots.map((s) => ({ instrument: s.instrument.name, count: s.count })),
		coming: j._count.attendances,
		imComing: j.attendances.length > 0
	};
}
export type JamCard = ReturnType<typeof toCard>;

/** Filtre des mineur·es (D5), appliqué après lecture. */
async function forViewer(viewerId: string, rows: JamRow[]) {
	const adult = await isAdult(viewerId);
	return rows
		.filter((j) => adult || endsBeforeCurfew(j.startsAt!, j.endsAt!))
		.map((j) => toCard(j, viewerId));
}

/** Jams à venir dans les lieux autour de soi (50 km), de la plus proche dans le temps. */
export async function upcomingJamsNear(viewerId: string, now = new Date()): Promise<JamCard[]> {
	const venues = await venuesNear(viewerId, { limit: 200 });
	if (venues.length === 0) return [];
	const rows = await findJams(viewerId, { venueId: { in: venues.map((v) => v.id) } }, now);
	return forViewer(viewerId, rows);
}

/** Jams à venir d'un lieu. */
export async function upcomingJamsAt(venueId: string, viewerId: string, now = new Date()) {
	return forViewer(viewerId, await findJams(viewerId, { venueId }, now));
}

/** Une jam visible par la personne, ou `null`. */
export async function getJam(id: string, viewerId: string, now = new Date()) {
	const rows = await findJams(viewerId, { id }, now, 1);
	const [card] = await forViewer(viewerId, rows);
	if (!card) return null;
	const row = rows[0];
	return { ...card, description: row.description, genreSlug: row.genreSlug };
}

/** « Je viens » : sans acceptation, sans XP (D27). */
export async function comeToJam(id: string, actorId: string, now = new Date()) {
	const jam = await getJam(id, actorId, now);
	if (!jam) throw new JamError('Jam introuvable.', 404);
	if (jam.isHost) throw new JamError('Tu tiens cette jam : tu y es déjà.');
	await prisma.jamAttendance.upsert({
		where: { opportunityId_actorId: { opportunityId: id, actorId } },
		create: { opportunityId: id, actorId },
		update: {}
	});
}

export async function notComingToJam(id: string, actorId: string) {
	await prisma.jamAttendance.deleteMany({ where: { opportunityId: id, actorId } });
}
