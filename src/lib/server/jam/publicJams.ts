/**
 * Jams publiques (P2-14b, D26, D27) : publier une jam dans un lieu de
 * l'annuaire, lister les jams à venir autour de soi, « Je viens ».
 * Formation et matériel (P2-14c) : le lead (l'hôte, ou la personne qu'il
 * désigne) invite des musicien·nes sur des places réservées ; le matériel
 * sur place vient du lieu, modifiable ; la fiche dit quoi apporter.
 *
 * Une jam est une annonce `JAM` avec un lieu, un début et une fin. Elle ne
 * rapporte aucune XP : ni à la publication, ni pour « Je viens » (D27).
 * Mineur·es (D5) : ils ne voient, ne rejoignent et ne publient que des jams
 * finies le jour même avant 22 h.
 */
import { canOrganizeJams, NOT_ORGANIZER_ERROR } from '#lib/jam/organizer';
import { prisma } from '#lib/server';
import { isIndexable } from '#lib/actors/visibility';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { checkStockQuota } from '#lib/server/trust/quotas';
import { notify } from '#lib/server/notifications/service';
import { getVenue, venuesNear } from '#lib/server/venues/service';
import { checkJamWindow, endsBeforeCurfew, type JamForm } from '#lib/jam/publicJam';
import {
	BACKLINE_LABELS,
	canReserve,
	holdsSpot,
	leadOf,
	packingSentence,
	spotBoard,
	whatToBring,
	type BacklineItem,
	type InviteForm
} from '#lib/jam/lineup';

export class JamError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

export async function isAdult(actorId: string) {
	const person = await prisma.person.findUnique({
		where: { actorId },
		select: { birthDate: true }
	});
	return isIndexable(person?.birthDate);
}

/** A coché « Prêt·e à organiser des jams » (D51), et est adulte. */
export async function isJamOrganizer(actorId: string, now = new Date()) {
	const person = await prisma.person.findUnique({
		where: { actorId },
		select: { organizesJams: true, birthDate: true }
	});
	return !!person && canOrganizeJams(person, now);
}

export async function createJam(actorId: string, form: JamForm, now = new Date()) {
	if (!(await isJamOrganizer(actorId, now))) throw new JamError(NOT_ORGANIZER_ERROR, 403);
	const window = checkJamWindow(form, now);
	if (!window.ok) throw new JamError(window.error);
	const { startsAt, endsAt } = window;
	if (!(await isAdult(actorId)) && !endsBeforeCurfew(startsAt, endsAt)) {
		throw new JamError('Ta jam doit finir avant 22 h.');
	}
	const venue = await getVenue(form.venueId, actorId);
	if (!venue) throw new JamError('Choisis un lieu de l’annuaire.');
	if (!venue.validated) {
		throw new JamError(
			'Ce lieu attend la confirmation d’un autre membre avant d’accueillir une jam.'
		);
	}
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
			backline: venue.backline,
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

const jamInclude = {
	venue: { select: { id: true, name: true, communeName: true, kind: true } },
	issuer: { select: { handle: true, displayName: true } },
	lead: { select: { handle: true, displayName: true } },
	jamSpots: {
		select: { count: true, instrumentId: true, instrument: { select: { name: true } } }
	},
	attendances: { select: { actorId: true, instrumentId: true } },
	jamInvites: {
		select: {
			actorId: true,
			instrumentId: true,
			status: true,
			actor: { select: { handle: true, displayName: true } },
			instrument: { select: { name: true } }
		}
	}
} as const;

type JamRow = Awaited<ReturnType<typeof findJams>>[number];

function findJams(viewerId: string, where: object, now: Date, take = 30) {
	return prisma.opportunity.findMany({
		where: {
			kind: 'JAM',
			status: 'OPEN',
			venueId: { not: null },
			venue: { removedAt: null, validatedAt: { not: null } },
			endsAt: { gt: now },
			issuer: publicActorWhere(now, viewerId),
			...where
		},
		orderBy: { startsAt: 'asc' },
		take,
		include: jamInclude
	});
}

function toCard(j: JamRow, viewerId: string) {
	const board = spotBoard(
		j.jamSpots.map((s) => ({
			instrumentId: s.instrumentId,
			name: s.instrument.name,
			count: s.count
		})),
		j.jamInvites,
		j.attendances
	);
	const accepted = j.jamInvites.filter((i) => i.status === 'ACCEPTED');
	return {
		id: j.id,
		title: j.title,
		startsAt: j.startsAt!,
		endsAt: j.endsAt!,
		venue: j.venue!,
		host: j.issuer,
		isHost: j.issuerActorId === viewerId,
		isLead: leadOf(j) === viewerId,
		spots: board.map((l) => ({ instrument: l.name, count: l.wanted, open: l.open })),
		coming: j.attendances.length + accepted.length,
		imComing:
			j.attendances.some((a) => a.actorId === viewerId) ||
			accepted.some((i) => i.actorId === viewerId)
	};
}
export type JamCard = ReturnType<typeof toCard>;

/** Filtre des mineur·es (D5), appliqué après lecture. */
async function forViewer(viewerId: string, rows: JamRow[]) {
	const adult = await isAdult(viewerId);
	return rows.filter((j) => adult || endsBeforeCurfew(j.startsAt!, j.endsAt!));
}

/** Jams à venir dans les lieux autour de soi (50 km), de la plus proche dans le temps. */
export async function upcomingJamsNear(viewerId: string, now = new Date()): Promise<JamCard[]> {
	const venues = await venuesNear(viewerId, { limit: 200 });
	if (venues.length === 0) return [];
	const rows = await findJams(viewerId, { venueId: { in: venues.map((v) => v.id) } }, now);
	return (await forViewer(viewerId, rows)).map((j) => toCard(j, viewerId));
}

/** Jams à venir d'un lieu. */
export async function upcomingJamsAt(venueId: string, viewerId: string, now = new Date()) {
	const rows = await forViewer(viewerId, await findJams(viewerId, { venueId }, now));
	return rows.map((j) => toCard(j, viewerId));
}

/** Jams à venir où la personne est invitée et n'a pas encore répondu. */
export async function myJamInvites(viewerId: string, now = new Date()): Promise<JamCard[]> {
	const rows = await findJams(
		viewerId,
		{ jamInvites: { some: { actorId: viewerId, status: 'INVITED' } } },
		now
	);
	return (await forViewer(viewerId, rows)).map((j) => toCard(j, viewerId));
}

async function findVisibleJam(id: string, viewerId: string, now: Date) {
	const [row] = await forViewer(viewerId, await findJams(viewerId, { id }, now, 1));
	return row ?? null;
}

/** L'instrument que la personne jouera : son invitation, son « Je viens », sinon son instrument principal. */
async function viewerInstrument(row: JamRow, viewerId: string) {
	const invite = row.jamInvites.find((i) => i.actorId === viewerId && holdsSpot(i.status));
	const attendance = row.attendances.find((a) => a.actorId === viewerId);
	const id = invite?.instrumentId ?? attendance?.instrumentId;
	const select = { id: true, slug: true, family: true, name: true } as const;
	if (id) return prisma.instrument.findUnique({ where: { id }, select });
	const primary = await prisma.personInstrument.findFirst({
		where: { personId: viewerId },
		orderBy: [{ isPrimary: 'desc' }, { declaredLevel: 'desc' }],
		select: { instrument: { select } }
	});
	return primary?.instrument ?? null;
}

/** Une jam visible par la personne, avec sa formation et son matériel, ou `null`. */
export async function getJam(id: string, viewerId: string, now = new Date()) {
	const row = await findVisibleJam(id, viewerId, now);
	if (!row) return null;
	const card = toCard(row, viewerId);
	const board = spotBoard(
		row.jamSpots.map((s) => ({
			instrumentId: s.instrumentId,
			name: s.instrument.name,
			count: s.count
		})),
		row.jamInvites,
		row.attendances
	);
	const instrument = await viewerInstrument(row, viewerId);
	const backline = row.backline as BacklineItem[];
	const myInvite = row.jamInvites.find((i) => i.actorId === viewerId) ?? null;
	const myAttendance = row.attendances.find((a) => a.actorId === viewerId) ?? null;
	const canManage = card.isHost || card.isLead;
	const invite = (i: (typeof row.jamInvites)[number]) => ({
		handle: i.actor.handle,
		displayName: i.actor.displayName,
		instrument: i.instrument.name,
		status: i.status
	});
	return {
		...card,
		description: row.description,
		genreSlug: row.genreSlug,
		lead: row.lead ?? row.issuer,
		hasDesignatedLead: row.leadActorId !== null,
		board: board.map((l) => ({
			instrumentId: l.instrumentId,
			name: l.name,
			wanted: l.wanted,
			reserved: l.reserved,
			taken: l.taken,
			open: l.open,
			reservable: canReserve(board, l.instrumentId)
		})),
		/** La formation : invitations acceptées, visibles de tous. */
		lineup: row.jamInvites.filter((i) => i.status === 'ACCEPTED').map(invite),
		/** Invitations en attente ou refusées : pour l'hôte et le lead seulement. */
		pendingInvites: canManage
			? row.jamInvites.filter((i) => i.status !== 'ACCEPTED').map(invite)
			: [],
		myInvite: myInvite ? { status: myInvite.status, instrument: myInvite.instrument.name } : null,
		myInstrumentId: myAttendance?.instrumentId ?? null,
		backline,
		backlineLabels: backline.map((b) => BACKLINE_LABELS[b]),
		packing: instrument
			? {
					instrument: instrument.name,
					slug: instrument.slug,
					sentence: packingSentence(whatToBring(instrument, backline))
				}
			: null,
		canManage
	};
}

/**
 * « Je viens », avec l'instrument qu'on jouera (facultatif) : sans
 * acceptation, sans XP (D27). L'instrument ne prend qu'une place ouverte.
 */
export async function comeToJam(
	id: string,
	actorId: string,
	instrumentSlug: string | null = null,
	now = new Date()
) {
	const row = await findVisibleJam(id, actorId, now);
	if (!row) throw new JamError('Jam introuvable.', 404);
	if (row.issuerActorId === actorId) throw new JamError('Tu tiens cette jam : tu y es déjà.');
	const invite = row.jamInvites.find((i) => i.actorId === actorId);
	if (invite?.status === 'ACCEPTED') throw new JamError('Tu fais déjà partie de la formation.');
	if (invite?.status === 'INVITED') {
		throw new JamError('Tu es invité·e : accepte l’invitation pour venir.');
	}
	let instrumentId: string | null = null;
	if (instrumentSlug) {
		const instrument = await prisma.instrument.findFirst({
			where: { slug: instrumentSlug, active: true },
			select: { id: true }
		});
		if (!instrument) throw new JamError('Instrument inconnu.');
		instrumentId = instrument.id;
	}
	await prisma.jamAttendance.upsert({
		where: { opportunityId_actorId: { opportunityId: id, actorId } },
		create: { opportunityId: id, actorId, instrumentId },
		update: { instrumentId }
	});
}

export async function notComingToJam(id: string, actorId: string) {
	await prisma.$transaction([
		prisma.jamAttendance.deleteMany({ where: { opportunityId: id, actorId } }),
		// Un·e membre de la formation qui ne vient plus libère sa place.
		prisma.jamInvite.updateMany({
			where: { opportunityId: id, actorId, status: 'ACCEPTED' },
			data: { status: 'DECLINED', respondedAt: new Date() }
		})
	]);
}

async function managedJam(id: string, actorId: string, now: Date) {
	const row = await findVisibleJam(id, actorId, now);
	if (!row) throw new JamError('Jam introuvable.', 404);
	if (row.issuerActorId !== actorId && leadOf(row) !== actorId) {
		throw new JamError('Seul·e l’hôte ou le lead peut faire cela.', 403);
	}
	return row;
}

/** Une personne visible par l'acteur, à partir de son identifiant public. */
async function findMusician(handle: string, viewerId: string, now: Date) {
	const actor = await prisma.actor.findFirst({
		where: { handle, person: { isNot: null }, ...publicActorWhere(now, viewerId) },
		select: { id: true, displayName: true }
	});
	if (!actor) throw new JamError('Aucun·e musicien·ne avec cet identifiant.', 404);
	return actor;
}

/**
 * Le lead invite un·e musicien·ne sur une place réservée. L'invitation tient
 * la place jusqu'à sa réponse.
 */
export async function inviteToJam(id: string, leadId: string, form: InviteForm, now = new Date()) {
	const row = await managedJam(id, leadId, now);
	const invitee = await findMusician(form.handle, leadId, now);
	if (invitee.id === leadId || invitee.id === row.issuerActorId) {
		throw new JamError('Tu ne peux pas t’inviter toi-même.');
	}
	const instrument = await prisma.instrument.findFirst({
		where: { slug: form.instrument, active: true },
		select: { id: true }
	});
	const board = spotBoard(
		row.jamSpots.map((s) => ({
			instrumentId: s.instrumentId,
			name: s.instrument.name,
			count: s.count
		})),
		row.jamInvites,
		row.attendances
	);
	if (!instrument || !board.some((l) => l.instrumentId === instrument.id)) {
		throw new JamError('Choisis un instrument recherché pour cette jam.');
	}
	const existing = row.jamInvites.find((i) => i.actorId === invitee.id);
	if (existing && holdsSpot(existing.status)) {
		throw new JamError(`${invitee.displayName} est déjà invité·e.`);
	}
	if (!canReserve(board, instrument.id)) {
		throw new JamError('Toutes les places de cet instrument sont déjà réservées.');
	}
	if (!(await isAdult(invitee.id)) && !endsBeforeCurfew(row.startsAt!, row.endsAt!)) {
		throw new JamError(`${invitee.displayName} ne peut pas venir à une jam qui finit après 22 h.`);
	}
	await prisma.jamInvite.upsert({
		where: { opportunityId_actorId: { opportunityId: id, actorId: invitee.id } },
		create: { opportunityId: id, actorId: invitee.id, instrumentId: instrument.id },
		update: { instrumentId: instrument.id, status: 'INVITED', createdAt: now, respondedAt: null }
	});
	// Notification (P2-09a) : une place est réservée, à accepter ou non.
	await notify(prisma, {
		recipientId: invitee.id,
		type: 'JAM_INVITE',
		fromActorId: leadId,
		href: `/jams/${id}`,
		title: row.title
	});
	return invitee;
}

/** Le lead retire une invitation : la place redevient ouverte. */
export async function cancelJamInvite(
	id: string,
	leadId: string,
	handle: string,
	now = new Date()
) {
	await managedJam(id, leadId, now);
	await prisma.jamInvite.deleteMany({ where: { opportunityId: id, actor: { handle } } });
}

/** L'invité·e accepte (et rejoint la formation) ou refuse (la place se libère). */
export async function respondToJamInvite(
	id: string,
	actorId: string,
	accept: boolean,
	now = new Date()
) {
	const row = await findVisibleJam(id, actorId, now);
	const invite = row?.jamInvites.find((i) => i.actorId === actorId);
	if (!row || !invite || invite.status !== 'INVITED') {
		throw new JamError('Invitation introuvable.', 404);
	}
	await prisma.$transaction([
		prisma.jamInvite.update({
			where: { opportunityId_actorId: { opportunityId: id, actorId } },
			data: { status: accept ? 'ACCEPTED' : 'DECLINED', respondedAt: now }
		}),
		// En formation, on ne compte plus deux fois la personne.
		...(accept ? [prisma.jamAttendance.deleteMany({ where: { opportunityId: id, actorId } })] : [])
	]);
}

/** L'hôte désigne le lead de la jam (identifiant vide : l'hôte reprend la main). */
export async function setJamLead(id: string, hostId: string, handle: string, now = new Date()) {
	const row = await findVisibleJam(id, hostId, now);
	if (!row) throw new JamError('Jam introuvable.', 404);
	if (row.issuerActorId !== hostId) throw new JamError('Seul·e l’hôte désigne le lead.', 403);
	let leadActorId: string | null = null;
	if (handle) {
		const lead = await findMusician(handle, hostId, now);
		if (lead.id !== hostId) leadActorId = lead.id;
	}
	await prisma.opportunity.update({ where: { id }, data: { leadActorId } });
}

/** L'hôte ou le lead ajuste le matériel sur place pour cette jam. */
export async function setJamBackline(
	id: string,
	actorId: string,
	backline: BacklineItem[],
	now = new Date()
) {
	await managedJam(id, actorId, now);
	await prisma.opportunity.update({ where: { id }, data: { backline } });
}
