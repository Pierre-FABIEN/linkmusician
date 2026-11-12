/**
 * Après la jam (P2-15, D27) : « J'y étais », qui était là, appréciations,
 * retrait d'un faux présent par l'hôte.
 *
 * « J'y étais » ne rapporte rien à qui le dit. Une jam publiée au nom d'un
 * lieu ou d'une organisation est **tenue** (`jam.held`, P5-04a) dès 3
 * présent·es hors organisation : 50 XP pour qui l'a publiée.
 * Une appréciation émet
 * `endorsement.received` (≈ 40 XP pour la personne appréciée, rendements
 * décroissants par paire). Un faux présent retiré par l'hôte voit ses
 * appréciations, données et reçues pour cette jam, reprises par
 * transaction négative liée (`reverseGain`), jamais effacées du registre,
 * et retirées du palier (`endorsement.revoked`).
 */
import { prisma } from '#lib/server';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { getTrustLevel } from '#lib/server/trust/quotas';
import { emitAndProcess } from '#lib/server/progression/processor';
import { revokeEndorsementEvent } from '#lib/server/endorsements/service';
import { notify } from '#lib/server/notifications/service';
import { TRUST_PERMISSIONS } from '#lib/server/progression/core/trust';
import { endsBeforeCurfew, parisMinutes } from '#lib/jam/publicJam';
import { leadOf } from '#lib/jam/lineup';
import { parisDay } from '#lib/metrics/indicators';
import {
	AFTER_JAM_DAYS,
	JAM_QUALITY_LABELS,
	afterJamDeadline,
	endorseRefusal,
	initials,
	isAfterJamOpen,
	type EndorseForm
} from '#lib/jam/afterJam';
import { audienceWhere, JamError, isAdult } from './publicJams';
import { networkIdsOf } from '#lib/server/network/service';
import { hostedBy, hostIdsOf, isHostOf, issuerManagersSelect } from './hosts';
import { BAREME } from '#lib/server/progression/core/bareme';

const DAY_MS = 86_400_000;

/** Présent·e : a dit « J'y étais », sans avoir été retiré·e par l'hôte. */
const presentWhere = { attendedAt: { not: null }, removedAt: null } as const;

/** Jam commencée, dans sa période d'après-jam, visible par la personne. */
async function findRecentJam(id: string, viewerId: string, now: Date) {
	const jam = await prisma.opportunity.findFirst({
		where: {
			id,
			kind: 'JAM',
			status: { in: ['OPEN', 'FILLED', 'EXPIRED'] },
			venue: { removedAt: null, validatedAt: { not: null } },
			startsAt: { lte: now },
			endsAt: { gte: new Date(now.getTime() - AFTER_JAM_DAYS * DAY_MS) },
			issuer: publicActorWhere(now, viewerId),
			// Atelier d'école (P5-11) : ses seuls membres.
			AND: [audienceWhere(viewerId)]
		},
		select: {
			id: true,
			audience: true,
			title: true,
			startsAt: true,
			endsAt: true,
			issuerActorId: true,
			issuer: { select: issuerManagersSelect },
			postedById: true,
			heldAt: true,
			leadActorId: true,
			venue: { select: { id: true, name: true, communeName: true, claimedByActorId: true } }
		}
	});
	if (!jam || !jam.startsAt || !jam.endsAt || !jam.venue) return null;
	if (!(await isAdult(viewerId)) && !endsBeforeCurfew(jam.startsAt, jam.endsAt)) return null;
	return { ...jam, startsAt: jam.startsAt, endsAt: jam.endsAt, venue: jam.venue };
}

/** « Qui était là ? » : la jam, les présent·es, et ce que la personne a déjà apprécié. */
export async function whoWasThere(id: string, viewerId: string, now = new Date()) {
	const jam = await findRecentJam(id, viewerId, now);
	if (!jam) return null;
	const [attendances, invites, given, me, trust] = await Promise.all([
		prisma.jamAttendance.findMany({
			where: { opportunityId: id, ...presentWhere, actor: publicActorWhere(now, viewerId) },
			orderBy: { attendedAt: 'asc' },
			select: {
				actorId: true,
				instrument: { select: { slug: true, name: true } },
				actor: { select: { handle: true, displayName: true } }
			}
		}),
		prisma.jamInvite.findMany({
			where: { opportunityId: id, status: 'ACCEPTED' },
			select: { actorId: true, instrument: { select: { slug: true, name: true } } }
		}),
		prisma.jamEndorsement.findMany({
			where: { opportunityId: id, fromActorId: viewerId, revokedAt: null },
			select: { toActorId: true, quality: true, instrument: { select: { name: true } } }
		}),
		prisma.jamAttendance.findUnique({
			where: { opportunityId_actorId: { opportunityId: id, actorId: viewerId } },
			select: { attendedAt: true, removedAt: true }
		}),
		getTrustLevel(viewerId)
	]);
	const network = await networkIdsOf(viewerId);
	const inviteOf = new Map(invites.map((i) => [i.actorId, i.instrument]));
	const givenTo = new Map(
		given.map((g) => [
			g.toActorId,
			g.quality ? JAM_QUALITY_LABELS[g.quality] : (g.instrument?.name.toLowerCase() ?? '')
		])
	);
	const hosts = hostIdsOf(jam);
	const isHost = hosts.includes(viewerId);
	return {
		jam: {
			id: jam.id,
			title: jam.title,
			startsAt: jam.startsAt,
			endsAt: jam.endsAt,
			venue: { id: jam.venue.id, name: jam.venue.name, communeName: jam.venue.communeName },
			isHost,
			deadline: afterJamDeadline(jam),
			open: isAfterJamOpen(jam, now)
		},
		iWasThere: Boolean(me?.attendedAt && !me.removedAt),
		removed: Boolean(me?.removedAt),
		canEndorse: TRUST_PERMISSIONS[trust].canEndorse,
		present: attendances.map((a) => {
			const instrument = a.instrument ?? inviteOf.get(a.actorId) ?? null;
			return {
				handle: a.actor.handle,
				displayName: a.actor.displayName,
				initials: initials(a.actor.displayName),
				instrument,
				isMe: a.actorId === viewerId,
				isHost: hosts.includes(a.actorId),
				appreciated: givenTo.get(a.actorId) ?? null,
				inNetwork: network.has(a.actorId)
			};
		})
	};
}

/** « J'y étais » : sans XP (D27). */
export async function iWasThere(id: string, actorId: string, now = new Date()) {
	const jam = await findRecentJam(id, actorId, now);
	if (!jam) throw new JamError('Jam introuvable.', 404);
	const existing = await prisma.jamAttendance.findUnique({
		where: { opportunityId_actorId: { opportunityId: id, actorId } },
		select: { removedAt: true, attendedAt: true }
	});
	if (existing?.removedAt)
		throw new JamError('L’hôte t’a retiré·e des présent·es de cette jam.', 403);
	// L'instrument de la formation, s'il y en a un.
	const invite = await prisma.jamInvite.findUnique({
		where: { opportunityId_actorId: { opportunityId: id, actorId } },
		select: { status: true, instrumentId: true }
	});
	const instrumentId = invite?.status === 'ACCEPTED' ? invite.instrumentId : undefined;
	await prisma.$transaction(async (tx) => {
		await tx.jamAttendance.upsert({
			where: { opportunityId_actorId: { opportunityId: id, actorId } },
			create: { opportunityId: id, actorId, attendedAt: now, instrumentId: instrumentId ?? null },
			update: { attendedAt: now, ...(instrumentId ? { instrumentId } : {}) }
		});
		if (existing?.attendedAt) return;
		// Faits des succès fun (P2-15b), sans XP (D27).
		const [instruments, invites] = await Promise.all([
			tx.jamAttendance.findMany({
				where: { actorId, attendedAt: { not: null }, removedAt: null, instrumentId: { not: null } },
				distinct: ['instrumentId'],
				select: { instrumentId: true }
			}),
			tx.jamInvite.findMany({ where: { opportunityId: id }, select: { status: true } })
		]);
		await emitAndProcess(tx, {
			type: 'jam.attended',
			actorId,
			jamId: id,
			lateNight: parisDay(jam.startsAt) !== parisDay(jam.endsAt),
			distinctInstruments: instruments.length,
			ledFullLineup:
				leadOf(jam) === actorId &&
				invites.length >= 2 &&
				invites.every((i) => i.status === 'ACCEPTED'),
			occurredAt: now
		});
		await markHeldIfReady(tx, jam, now);
	});
}

type RecentJam = NonNullable<Awaited<ReturnType<typeof findRecentJam>>>;

/**
 * Jam publique tenue (P5-04a, 02 §2.2) : publiée au nom d'un lieu ou d'une
 * organisation, elle l'est dès 3 présent·es hors organisation. Posée une
 * seule fois (`heldAt`), elle émet `jam.held` : 50 XP pour la personne qui
 * l'a publiée, une date de plus pour le rang du lieu. Une jam lancée par
 * un·e musicien·ne en son nom n'est jamais « tenue » (Q42).
 */
async function markHeldIfReady(tx: Tx, jam: RecentJam, now: Date) {
	// Un atelier d'école n'est pas une jam publique : il n'est jamais « tenu » (Q53).
	if (jam.heldAt || !jam.issuer.organization || jam.audience === 'SCHOOL') return;
	const hosts = new Set(hostIdsOf(jam));
	const present = await tx.jamAttendance.findMany({
		where: { opportunityId: jam.id, ...presentWhere },
		select: { actorId: true }
	});
	const confirmerIds = present.map((p) => p.actorId).filter((id) => !hosts.has(id));
	if (confirmerIds.length < BAREME.jamHeldMinPresent) return;
	const { count } = await tx.opportunity.updateMany({
		where: { id: jam.id, heldAt: null },
		data: { heldAt: now }
	});
	if (count === 0) return;
	await emitAndProcess(tx, {
		type: 'jam.held',
		jamId: jam.id,
		organizerIds: jam.postedById && hosts.has(jam.postedById) ? [jam.postedById] : [],
		confirmerIds,
		...(jam.venue.claimedByActorId ? { venueOrgId: jam.venue.claimedByActorId } : {}),
		occurredAt: now
	});
}

/** Retirer son « J'y étais » : ses appréciations, données et reçues, sont reprises. */
export async function notThere(id: string, actorId: string, now = new Date()) {
	const jam = await findRecentJam(id, actorId, now);
	if (!jam) throw new JamError('Jam introuvable.', 404);
	await prisma.$transaction(async (tx) => {
		await tx.jamAttendance.updateMany({
			where: { opportunityId: id, actorId, removedAt: null },
			data: { attendedAt: null }
		});
		await revokeEndorsementsOf(tx, id, actorId, 'Présence retirée');
	});
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function revokeEndorsementsOf(tx: Tx, jamId: string, actorId: string, reason: string) {
	const endorsements = await tx.jamEndorsement.findMany({
		where: {
			opportunityId: jamId,
			revokedAt: null,
			OR: [{ fromActorId: actorId }, { toActorId: actorId }]
		},
		select: { id: true, eventId: true, fromActorId: true, toActorId: true }
	});
	for (const e of endorsements) {
		await tx.jamEndorsement.update({ where: { id: e.id }, data: { revokedAt: new Date() } });
		await revokeEndorsementEvent(tx, {
			eventId: e.eventId,
			actorId: e.toActorId,
			endorserId: e.fromActorId,
			reason
		});
	}
}

/**
 * L'hôte retire un faux présent : il n'apparaît plus, ne peut plus redire
 * « J'y étais », et les appréciations liées sont reprises.
 */
export async function removeFromJam(id: string, hostId: string, handle: string, now = new Date()) {
	const jam = await findRecentJam(id, hostId, now);
	if (!jam) throw new JamError('Jam introuvable.', 404);
	if (!isHostOf(jam, hostId)) throw new JamError('Seul·e l’hôte retire un présent.', 403);
	const attendance = await prisma.jamAttendance.findFirst({
		where: { opportunityId: id, actor: { handle }, ...presentWhere },
		select: { actorId: true }
	});
	if (!attendance) throw new JamError('Cette personne n’est pas dans les présent·es.', 404);
	if (isHostOf(jam, attendance.actorId)) {
		throw new JamError(
			attendance.actorId === hostId
				? 'Tu ne peux pas te retirer toi-même.'
				: 'Les personnes qui tiennent la jam ne se retirent pas entre elles.'
		);
	}
	await prisma.$transaction(async (tx) => {
		await tx.jamAttendance.update({
			where: { opportunityId_actorId: { opportunityId: id, actorId: attendance.actorId } },
			data: { removedAt: now }
		});
		await revokeEndorsementsOf(tx, id, attendance.actorId, 'Présence retirée par l’hôte');
	});
}

/** Apprécier un·e autre présent·e : une par paire et par jam, TL1 requise. */
export async function endorse(id: string, fromId: string, form: EndorseForm, now = new Date()) {
	const jam = await findRecentJam(id, fromId, now);
	if (!jam) throw new JamError('Jam introuvable.', 404);
	const to = await prisma.actor.findFirst({
		where: { handle: form.to, ...publicActorWhere(now, fromId) },
		select: { id: true, displayName: true }
	});
	if (!to) throw new JamError('Personne inconnue.', 404);
	const [fromAttendance, toAttendance, already, trust, instrument] = await Promise.all([
		prisma.jamAttendance.findFirst({
			where: { opportunityId: id, actorId: fromId, ...presentWhere },
			select: { actorId: true }
		}),
		prisma.jamAttendance.findFirst({
			where: { opportunityId: id, actorId: to.id, ...presentWhere },
			select: { actorId: true }
		}),
		prisma.jamEndorsement.findUnique({
			where: {
				opportunityId_fromActorId_toActorId: {
					opportunityId: id,
					fromActorId: fromId,
					toActorId: to.id
				}
			},
			select: { id: true }
		}),
		getTrustLevel(fromId),
		form.instrument
			? prisma.instrument.findFirst({
					where: { slug: form.instrument, active: true },
					select: { id: true, name: true }
				})
			: null
	]);
	const refusal = endorseRefusal({
		now,
		jam,
		fromId,
		toId: to.id,
		fromPresent: Boolean(fromAttendance),
		toPresent: Boolean(toAttendance),
		fromCanEndorse: TRUST_PERMISSIONS[trust].canEndorse,
		alreadyEndorsed: Boolean(already)
	});
	if (refusal) throw new JamError(refusal, 403);
	if (form.instrument && !instrument) throw new JamError('Instrument inconnu.');
	const skill = form.quality ? JAM_QUALITY_LABELS[form.quality] : instrument!.name.toLowerCase();
	await prisma.$transaction(async (tx) => {
		const row = await tx.jamEndorsement.create({
			data: {
				opportunityId: id,
				fromActorId: fromId,
				toActorId: to.id,
				quality: form.quality ?? null,
				instrumentId: instrument?.id ?? null
			}
		});
		const result = await emitAndProcess(tx, {
			type: 'endorsement.received',
			actorId: to.id,
			endorserId: fromId,
			skill,
			jamId: id,
			occurredAt: now
		});
		await tx.jamEndorsement.update({ where: { id: row.id }, data: { eventId: result.eventId } });
		// Notification (P2-09a) : l'appréciation se lit sur son profil.
		await notify(tx, {
			recipientId: to.id,
			type: 'ENDORSEMENT',
			fromActorId: fromId,
			href: `/@${form.to}`,
			title: skill
		});
	});
	return { displayName: to.displayName, skill };
}

/**
 * Jams récentes de la personne (attendue, en formation, hôte, ou déjà
 * présente) encore dans leur période d'après-jam : « Tu y étais ? ».
 */
export async function myRecentJams(viewerId: string, now = new Date()) {
	const rows = await prisma.opportunity.findMany({
		where: {
			kind: 'JAM',
			status: { in: ['OPEN', 'FILLED', 'EXPIRED'] },
			venue: { removedAt: null, validatedAt: { not: null } },
			startsAt: { lte: now },
			endsAt: { gte: new Date(now.getTime() - AFTER_JAM_DAYS * DAY_MS) },
			OR: [
				hostedBy(viewerId),
				{ attendances: { some: { actorId: viewerId, removedAt: null } } },
				{ jamInvites: { some: { actorId: viewerId, status: 'ACCEPTED' } } }
			]
		},
		orderBy: { startsAt: 'desc' },
		take: 10,
		select: {
			id: true,
			title: true,
			startsAt: true,
			venue: { select: { name: true } },
			attendances: { where: { actorId: viewerId }, select: { attendedAt: true } }
		}
	});
	return rows.map((j) => ({
		id: j.id,
		title: j.title,
		startsAt: j.startsAt!,
		venue: j.venue?.name ?? '',
		attended: Boolean(j.attendances[0]?.attendedAt)
	}));
}

/**
 * « Apprécier les musicos croisés » (D50) : la jam en cours et celles de la
 * période d'après-jam où la personne était, avec le nombre d'autres
 * présent·es et d'appréciations déjà laissées. Seulement des compteurs : les
 * visages sont sur « Qui était là ? ».
 */
export async function crossedJams(viewerId: string, now = new Date()) {
	const rows = await prisma.opportunity.findMany({
		where: {
			kind: 'JAM',
			status: { in: ['OPEN', 'FILLED', 'EXPIRED'] },
			venue: { removedAt: null, validatedAt: { not: null } },
			startsAt: { lte: now },
			endsAt: { gte: new Date(now.getTime() - AFTER_JAM_DAYS * DAY_MS) },
			OR: [
				hostedBy(viewerId),
				{ attendances: { some: { actorId: viewerId, removedAt: null } } },
				{ jamInvites: { some: { actorId: viewerId, status: 'ACCEPTED' } } }
			]
		},
		orderBy: { startsAt: 'desc' },
		take: 10,
		select: {
			id: true,
			title: true,
			startsAt: true,
			endsAt: true,
			venue: { select: { name: true } },
			attendances: {
				where: { ...presentWhere, actor: publicActorWhere(now, viewerId) },
				select: { actorId: true }
			},
			endorsements: {
				where: { fromActorId: viewerId, revokedAt: null },
				select: { toActorId: true }
			}
		}
	});
	return rows.map((j) => {
		const present = j.attendances.map((a) => a.actorId);
		const others = new Set(present.filter((id) => id !== viewerId));
		return {
			id: j.id,
			title: j.title,
			startsAt: j.startsAt!,
			endsAt: j.endsAt!,
			venue: j.venue?.name ?? '',
			attended: present.includes(viewerId),
			others: others.size,
			given: j.endorsements.filter((e) => others.has(e.toActorId)).length
		};
	});
}
export type CrossedJamRow = Awaited<ReturnType<typeof crossedJams>>[number];

const hhmm = (minutes: number) =>
	`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * « Rejouer ensemble » (P2-15b) : brouillon d'une nouvelle jam reprenant
 * une jam où la personne était (lieu, titre, horaires, style, places).
 * `null` si elle n'y était pas.
 */
export async function replayDraft(jamId: string, viewerId: string) {
	const jam = await prisma.opportunity.findFirst({
		where: {
			id: jamId,
			kind: 'JAM',
			OR: [
				hostedBy(viewerId),
				{ attendances: { some: { actorId: viewerId, ...presentWhere } } },
				{ jamInvites: { some: { actorId: viewerId, status: 'ACCEPTED' } } }
			]
		},
		select: {
			title: true,
			description: true,
			genreSlug: true,
			startsAt: true,
			endsAt: true,
			venueId: true,
			jamSpots: { select: { count: true, instrument: { select: { slug: true } } } }
		}
	});
	if (!jam?.startsAt || !jam.endsAt) return null;
	return {
		venueId: jam.venueId,
		title: jam.title,
		description: jam.description,
		genre: jam.genreSlug ?? '',
		start: hhmm(parisMinutes(jam.startsAt)),
		end: hhmm(parisMinutes(jam.endsAt)),
		spots: jam.jamSpots.map((s) => ({ slug: s.instrument.slug, count: s.count }))
	};
}
