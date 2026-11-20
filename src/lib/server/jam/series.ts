/**
 * Scènes ouvertes récurrentes (P5-04a, conception 08 §14) : un lieu publie
 * une jam chaque semaine, le même jour et aux mêmes heures. Règles pures dans
 * `#lib/jam/series`.
 *
 * - Publier : gérer le lieu (OWNER, ADMIN), être majeur·e (D5), fiche du lieu
 *   publiée, lieu validé de l'annuaire (D26). Le métier d'organisateur·rice
 *   et la case « prêt·e à organiser des jams » ne sont pas demandés, comme
 *   pour les dates du lieu (Q34). Trois séries actives par lieu au plus.
 * - Les jams sont publiées **au nom du lieu** (`issuerActorId`), la personne
 *   est notée (`postedById`) ; toute la gestion du lieu en est hôte.
 * - Un job quotidien (`/api/jobs/opportunities`) crée les jams des 4
 *   semaines à venir ; la création de la série les crée aussitôt.
 *   Idempotent : une jam par série et par début (`@@unique`).
 * - Aucune notification de masse (piège du repérage) et aucune XP à la
 *   publication : seule la jam tenue rapporte (`jam.held`).
 * - Lead par défaut (P5-04b) : un·e animateur·rice actif·ve du lieu
 *   (`VenueHost`), copié·e sur chaque jam créée et sur les jams à venir qui
 *   n'ont pas d'autre lead.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { isAdult, JamError } from './publicJams';
import { cancelJamsTx } from './cancel';
import {
	checkSeriesWindow,
	MAX_SERIES_PER_VENUE,
	seriesLabel,
	upcomingSeriesWindows,
	type SeriesForm
} from '#lib/jam/series';

type Spot = { instrumentId: string; count: number };

/** Le lieu revendiqué et l'organisation qui le gère, si la personne la gère. */
async function managedVenue(venueId: string, personId: string) {
	const venue = await prisma.venue.findFirst({
		where: {
			id: venueId,
			removedAt: null,
			claimedBy: {
				deletedAt: null,
				organization: {
					kind: 'VENUE',
					dissolvedAt: null,
					memberships: {
						some: { personId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } }
					}
				}
			}
		},
		select: {
			id: true,
			name: true,
			validatedAt: true,
			backline: true,
			claimedByActorId: true,
			claimedBy: {
				select: { organization: { select: { venueProfile: { select: { publishedAt: true } } } } }
			}
		}
	});
	if (!venue?.claimedByActorId) {
		throw new JamError('Seules les personnes qui gèrent le lieu publient sa scène ouverte.', 403);
	}
	return { ...venue, orgId: venue.claimedByActorId };
}

/** Publier une scène ouverte récurrente, et ses jams des 4 semaines à venir. */
export async function createJamSeries(
	personId: string,
	venueId: string,
	form: SeriesForm,
	now = new Date()
) {
	const venue = await managedVenue(venueId, personId);
	if (!(await isAdult(personId))) {
		throw new JamError('Il faut être majeur·e pour publier une scène ouverte.', 403);
	}
	if (!venue.claimedBy?.organization?.venueProfile?.publishedAt) {
		throw new JamError('Publie d’abord la fiche du lieu.');
	}
	if (!venue.validatedAt) {
		throw new JamError('Ce lieu attend la confirmation d’un autre membre de l’annuaire.');
	}
	const windowError = checkSeriesWindow(form);
	if (windowError) throw new JamError(windowError);
	const active = await prisma.jamSeries.count({
		where: { issuerActorId: venue.orgId, stoppedAt: null }
	});
	if (active >= MAX_SERIES_PER_VENUE) {
		throw new JamError(
			`Le lieu a déjà ${MAX_SERIES_PER_VENUE} scènes ouvertes. Arrêtes-en une d’abord.`
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
	const spots: Spot[] = form.spots.map((s) => ({
		instrumentId: idOf.get(s.instrument)!,
		count: s.count
	}));
	const series = await prisma.jamSeries.create({
		data: {
			issuerActorId: venue.orgId,
			postedById: personId,
			venueId: venue.id,
			weekday: form.weekday,
			startTime: form.start,
			endTime: form.end,
			title: form.title,
			description: form.description,
			genreSlug: genre?.slug ?? null,
			spots
		},
		select: { id: true }
	});
	await generateForSeries(series.id, now);
	return series;
}

/**
 * Arrêter une série : plus de nouvelle jam ; celles à venir sont annulées
 * et leurs inscrit·es prévenu·es (#91a), la trace reste.
 */
export async function stopJamSeries(personId: string, seriesId: string, now = new Date()) {
	const series = await prisma.jamSeries.findUnique({
		where: { id: seriesId },
		select: { venueId: true, stoppedAt: true }
	});
	if (!series) throw new JamError('Scène ouverte introuvable.', 404);
	await managedVenue(series.venueId, personId);
	if (series.stoppedAt) return;
	await prisma.$transaction(async (tx) => {
		await tx.jamSeries.update({ where: { id: seriesId }, data: { stoppedAt: now } });
		const upcoming = await tx.opportunity.findMany({
			where: { seriesId, status: 'OPEN', startsAt: { gt: now } },
			select: { id: true }
		});
		await cancelJamsTx(
			tx,
			upcoming.map((j) => j.id),
			{ byId: personId, reason: 'La scène ouverte s’arrête.', now }
		);
	});
}

/** Les jams manquantes d'une série active, dans les 4 semaines à venir. */
async function generateForSeries(seriesId: string, now: Date) {
	const series = await prisma.jamSeries.findFirst({
		where: {
			id: seriesId,
			stoppedAt: null,
			// Le lieu existe, est validé, et sa fiche est publiée par une organisation vivante.
			venue: { removedAt: null, validatedAt: { not: null } },
			issuer: {
				deletedAt: null,
				organization: { dissolvedAt: null, venueProfile: { publishedAt: { not: null } } }
			}
		},
		include: {
			venue: { select: { backline: true } },
			jams: { where: { startsAt: { gt: now } }, select: { startsAt: true } }
		}
	});
	if (!series) return 0;
	const existing = new Set(series.jams.map((j) => j.startsAt?.getTime()));
	const spots = series.spots as Spot[];
	let created = 0;
	for (const { startsAt, endsAt } of upcomingSeriesWindows(series, now)) {
		if (existing.has(startsAt.getTime())) continue;
		try {
			await prisma.opportunity.create({
				data: {
					issuerActorId: series.issuerActorId,
					postedById: series.postedById,
					kind: 'JAM',
					title: series.title,
					description: series.description,
					genreSlug: series.genreSlug,
					startsAt,
					endsAt,
					expiresAt: endsAt,
					venueId: series.venueId,
					backline: series.venue.backline,
					seriesId: series.id,
					leadActorId: series.leadId,
					slots: Math.max(
						1,
						spots.reduce((n, s) => n + s.count, 0)
					),
					jamSpots: { create: spots }
				}
			});
			created++;
		} catch (err) {
			// Créée entre-temps par une autre exécution : rien à faire.
			if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue;
			throw err;
		}
	}
	return created;
}

/**
 * Choisir le lead par défaut d'une série (vide : aucun). Il doit animer au
 * lieu (`VenueHost` actif). Les jams à venir sans lead, ou menées par
 * l'ancien lead par défaut, passent au nouveau ; un lead choisi pour une
 * soirée précise reste.
 */
export async function setSeriesLead(
	personId: string,
	seriesId: string,
	handle: string,
	now = new Date()
) {
	const series = await prisma.jamSeries.findUnique({
		where: { id: seriesId },
		select: { venueId: true, issuerActorId: true, leadId: true, stoppedAt: true }
	});
	if (!series || series.stoppedAt) throw new JamError('Scène ouverte introuvable.', 404);
	await managedVenue(series.venueId, personId);
	let leadId: string | null = null;
	if (handle) {
		const host = await prisma.venueHost.findFirst({
			where: {
				orgId: series.issuerActorId,
				status: 'ACTIVE',
				person: { handle: handle.trim().replace(/^@/, '').toLowerCase(), deletedAt: null }
			},
			select: { personId: true }
		});
		if (!host) throw new JamError('Choisis une personne qui anime au lieu.');
		leadId = host.personId;
	}
	if (leadId === series.leadId) return;
	await prisma.$transaction([
		prisma.jamSeries.update({ where: { id: seriesId }, data: { leadId } }),
		prisma.opportunity.updateMany({
			where: {
				seriesId,
				status: 'OPEN',
				startsAt: { gt: now },
				OR: [{ leadActorId: null }, ...(series.leadId ? [{ leadActorId: series.leadId }] : [])]
			},
			data: { leadActorId: leadId }
		})
	]);
}

/** Job quotidien : les jams des 4 semaines à venir pour toutes les séries actives. */
export async function generateSeriesJams(now = new Date()) {
	const series = await prisma.jamSeries.findMany({
		where: { stoppedAt: null },
		select: { id: true }
	});
	let created = 0;
	for (const s of series) created += await generateForSeries(s.id, now);
	return { series: series.length, jamsCreated: created };
}

/** Scènes ouvertes d'un lieu, pour sa gestion : actives d'abord, avec la prochaine date. */
export async function venueSeries(venueId: string, now = new Date()) {
	const rows = await prisma.jamSeries.findMany({
		where: { venueId },
		orderBy: [{ stoppedAt: { sort: 'desc', nulls: 'first' } }, { weekday: 'asc' }],
		take: 10,
		select: {
			id: true,
			title: true,
			weekday: true,
			startTime: true,
			endTime: true,
			stoppedAt: true,
			lead: { select: { handle: true, displayName: true } },
			jams: {
				where: { status: 'OPEN', startsAt: { gt: now } },
				orderBy: { startsAt: 'asc' },
				take: 1,
				select: { id: true, startsAt: true }
			}
		}
	});
	return rows.map((r) => ({
		id: r.id,
		title: r.title,
		label: seriesLabel(r.weekday),
		hours: `${r.startTime.replace(':', ' h ')}–${r.endTime.replace(':', ' h ')}`.replaceAll(
			' h 00',
			' h'
		),
		stopped: r.stoppedAt !== null,
		lead: r.lead ? { handle: r.lead.handle, displayName: r.lead.displayName } : null,
		next: r.jams[0] ? { id: r.jams[0].id, startsAt: r.jams[0].startsAt! } : null
	}));
}
export type VenueSeriesRow = Awaited<ReturnType<typeof venueSeries>>[number];
