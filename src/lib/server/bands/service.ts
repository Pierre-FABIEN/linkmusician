/**
 * Groupes et adhésions (P3-01), seul point d'écriture de `Organization` et
 * `Membership`. Chaque écriture prend un verrou sur le groupe : deux
 * acceptations simultanées ne forment pas le groupe deux fois, et le groupe
 * garde toujours un OWNER.
 *
 * Progression : créer un groupe ne rapporte rien. À la 2ᵉ adhésion active,
 * le groupe est **formé** : `membership.accepted` pour chaque membre actif
 * et étape `FORMATION` vérifiée (membres présents : 25 %, ligne `Milestone`
 * écrite par `#lib/server/milestones/service`). Ensuite, chaque
 * nouvelle adhésion active émet `membership.accepted` (rendements
 * décroissants par groupe, gérés par le moteur). Un départ ne reprend rien.
 *
 * Mineur·es (D5) : un·e mineur·e ne reçoit pas d'invitation d'un·e inconnu·e
 * (même règle que les demandes de message), sans que la raison soit dite.
 * Il ou elle peut demander à rejoindre un groupe.
 */
import type { OrgRole, Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { suggestHandle } from '#lib/actors/handle';
import { isIndexable } from '#lib/actors/visibility';
import { publicActorWhere } from '#lib/server/actors/visibility';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { playedTogether } from '#lib/server/network/service';
import { notify } from '#lib/server/notifications/service';
import { emitAndProcess } from '#lib/server/progression/processor';
import { bandTierOf, recordFormation, syncComposition } from '#lib/server/milestones/service';
import { clearActorLocation, setActorLocation } from '#lib/server/geo/queries';
import type { Commune } from '#lib/geo/fuzz';
import { addExternalMedia, deleteOwnMedia, MediaError } from '#lib/server/media/service';
import {
	BAND_ERRORS,
	MAX_ACTIVE_BANDS,
	MAX_PENDING_INVITES,
	OPEN_STATUSES,
	canRemove,
	compareMembers,
	formsBand,
	isManager,
	leaveCheck,
	type BandForm
} from '#lib/bands/rules';

export class BandError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

type Tx = Prisma.TransactionClient;
/** Le traitement d'un événement de progression peut dépasser 5 s (P2-08). */
const TX = { timeout: 20_000 } as const;

const open = { in: [...OPEN_STATUSES] };

async function lockBand(tx: Tx, bandId: string) {
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`band:${bandId}`}))`;
}

/** Le groupe, non dissous, avec son nom (404 sinon). */
async function liveBand(tx: Tx, bandId: string) {
	const band = await tx.organization.findFirst({
		where: { actorId: bandId, kind: 'BAND', dissolvedAt: null, actor: { deletedAt: null } },
		select: {
			actorId: true,
			formedAt: true,
			actor: { select: { handle: true, displayName: true } }
		}
	});
	if (!band) throw new BandError('Ce groupe n’existe plus.', 404);
	return band;
}

async function activeMembership(tx: Tx, bandId: string, personId: string) {
	return tx.membership.findFirst({
		where: { orgId: bandId, personId, status: 'ACTIVE' },
		select: { id: true, role: true }
	});
}

async function requireManager(tx: Tx, bandId: string, personId: string) {
	const mine = await activeMembership(tx, bandId, personId);
	if (!mine || !isManager(mine.role)) {
		throw new BandError('Seules les personnes qui gèrent le groupe peuvent faire cela.', 403);
	}
	return mine;
}

async function countActiveBands(tx: Tx, personId: string) {
	return tx.membership.count({
		where: { personId, status: 'ACTIVE', org: { dissolvedAt: null } }
	});
}

/** Responsables et co-gestion du groupe, pour les notifications. */
async function managersOf(tx: Tx, bandId: string) {
	const rows = await tx.membership.findMany({
		where: { orgId: bandId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } },
		select: { personId: true }
	});
	return rows.map((r) => r.personId);
}

/**
 * Une adhésion vient de devenir active : forme le groupe à la 2ᵉ, émet les
 * événements de progression, prévient la gestion.
 */
async function afterJoin(
	tx: Tx,
	bandId: string,
	personId: string,
	now: Date,
	/** Qui vient d'accepter (pas besoin de le lui annoncer). */
	actingId: string
) {
	const band = await tx.organization.findUniqueOrThrow({
		where: { actorId: bandId },
		select: { formedAt: true, actor: { select: { handle: true, displayName: true } } }
	});
	const active = await tx.membership.findMany({
		where: { orgId: bandId, status: 'ACTIVE' },
		select: { personId: true }
	});
	const memberIds = active.map((m) => m.personId);
	if (formsBand({ formedAt: band.formedAt, activeMembers: memberIds.length })) {
		await tx.organization.update({ where: { actorId: bandId }, data: { formedAt: now } });
		for (const id of memberIds) {
			await emitAndProcess(tx, {
				type: 'membership.accepted',
				personId: id,
				bandId,
				occurredAt: now
			});
		}
		// Étapes (P3-04) : « Formation » vérifiée, et « Première composition »
		// si le groupe avait déjà composé seul.
		await recordFormation(tx, bandId, memberIds, now);
		await syncComposition(tx, bandId, now);
	} else if (band.formedAt) {
		await emitAndProcess(tx, { type: 'membership.accepted', personId, bandId, occurredAt: now });
	}
	for (const managerId of await managersOf(tx, bandId)) {
		if (managerId === actingId) continue;
		await notify(tx, {
			recipientId: managerId,
			type: 'BAND_JOINED',
			fromActorId: personId,
			href: `/groupes/${band.actor.handle}`,
			title: band.actor.displayName
		});
	}
}

/** Monter un groupe : la personne en est responsable. Ne rapporte rien. */
export async function createBand(personId: string, form: BandForm, now = new Date()) {
	if ((await countActiveBands(prisma, personId)) >= MAX_ACTIVE_BANDS) {
		throw new BandError(`Tu es déjà dans ${MAX_ACTIVE_BANDS} groupes.`);
	}
	const handle = await suggestHandle(form.name, async (candidate) =>
		Boolean(await prisma.actor.findUnique({ where: { handle: candidate }, select: { id: true } }))
	);
	return prisma.$transaction(async (tx) => {
		const actor = await tx.actor.create({
			data: {
				kind: 'ORGANIZATION',
				handle,
				displayName: form.name,
				organization: { create: { kind: 'BAND' } }
			},
			select: { id: true, handle: true }
		});
		await tx.membership.create({
			data: {
				orgId: actor.id,
				personId,
				role: 'OWNER',
				title: form.title,
				status: 'ACTIVE',
				startedAt: now
			}
		});
		return actor;
	}, TX);
}

/**
 * Un·e mineur·e ne reçoit d'invitation que d'une personne qu'il ou elle
 * connaît : conversation acceptée des deux côtés, ou jouée ensemble.
 */
export async function canInviteMinor(inviterId: string, inviteeId: string) {
	const conversation = await prisma.conversation.findFirst({
		where: {
			AND: [
				{ participants: { some: { actorId: inviterId, state: 'ACCEPTED' } } },
				{ participants: { some: { actorId: inviteeId, state: 'ACCEPTED' } } }
			]
		},
		select: { id: true }
	});
	return Boolean(conversation) || (await playedTogether(inviterId, inviteeId));
}

/** Inviter une personne (par son @handle). */
export async function inviteToBand(
	bandId: string,
	inviterId: string,
	input: { handle: string; title: string | null },
	now = new Date()
) {
	const invitee = await prisma.actor.findFirst({
		where: { handle: input.handle, person: { isNot: null }, ...publicActorWhere(now, inviterId) },
		select: { id: true, displayName: true, person: { select: { birthDate: true } } }
	});
	if (!invitee) throw new BandError('Aucun·e musicien·ne avec cet identifiant.', 404);
	if (invitee.id === inviterId) throw new BandError('Tu fais déjà partie du groupe.');
	const unreachable = new BandError(
		`${invitee.displayName} ne peut pas recevoir d’invitation pour l’instant.`
	);
	if (await isBlockedBetween(inviterId, invitee.id)) throw unreachable;
	if (
		!isIndexable(invitee.person?.birthDate, now) &&
		!(await canInviteMinor(inviterId, invitee.id))
	) {
		throw unreachable;
	}
	await prisma.$transaction(async (tx) => {
		await lockBand(tx, bandId);
		const band = await liveBand(tx, bandId);
		await requireManager(tx, bandId, inviterId);
		const existing = await tx.membership.findFirst({
			where: { orgId: bandId, personId: invitee.id, status: open },
			select: { id: true, status: true }
		});
		if (existing?.status === 'ACTIVE') {
			throw new BandError(`${invitee.displayName} fait déjà partie du groupe.`);
		}
		if (existing?.status === 'INVITED') {
			throw new BandError(`${invitee.displayName} a déjà une invitation en attente.`);
		}
		if (existing?.status === 'REQUESTED') {
			throw new BandError(
				`${invitee.displayName} a déjà demandé à rejoindre le groupe : accepte sa demande.`
			);
		}
		const pending = await tx.membership.count({ where: { orgId: bandId, status: 'INVITED' } });
		if (pending >= MAX_PENDING_INVITES) {
			throw new BandError(
				`Le groupe a déjà ${MAX_PENDING_INVITES} invitations en attente : attends des réponses.`
			);
		}
		await tx.membership.create({
			data: {
				orgId: bandId,
				personId: invitee.id,
				status: 'INVITED',
				invitedById: inviterId,
				title: input.title
			}
		});
		await notify(tx, {
			recipientId: invitee.id,
			type: 'BAND_INVITE',
			fromActorId: inviterId,
			href: '/groupes',
			title: band.actor.displayName
		});
	}, TX);
	return invitee;
}

/** Demander à rejoindre un groupe. */
export async function requestToJoin(bandId: string, personId: string) {
	if ((await countActiveBands(prisma, personId)) >= MAX_ACTIVE_BANDS) {
		throw new BandError(`Tu es déjà dans ${MAX_ACTIVE_BANDS} groupes.`);
	}
	await prisma.$transaction(async (tx) => {
		await lockBand(tx, bandId);
		const band = await liveBand(tx, bandId);
		const managers = await managersOf(tx, bandId);
		for (const managerId of managers) {
			if (await isBlockedBetween(personId, managerId)) {
				throw new BandError('Tu ne peux pas rejoindre ce groupe.', 403);
			}
		}
		const existing = await tx.membership.findFirst({
			where: { orgId: bandId, personId, status: open },
			select: { status: true }
		});
		if (existing?.status === 'ACTIVE') throw new BandError('Tu fais déjà partie du groupe.');
		if (existing?.status === 'REQUESTED') throw new BandError('Ta demande est déjà envoyée.');
		if (existing?.status === 'INVITED') {
			throw new BandError('Le groupe t’a déjà invité·e : accepte son invitation.');
		}
		await tx.membership.create({ data: { orgId: bandId, personId, status: 'REQUESTED' } });
		for (const managerId of managers) {
			await notify(tx, {
				recipientId: managerId,
				type: 'BAND_REQUEST',
				fromActorId: personId,
				href: `/groupes/${band.actor.handle}`,
				title: band.actor.displayName
			});
		}
	}, TX);
}

async function pendingRow(tx: Tx, membershipId: string) {
	const row = await tx.membership.findUnique({
		where: { id: membershipId },
		select: { id: true, orgId: true, personId: true, status: true, role: true }
	});
	if (!row) throw new BandError('Cette invitation n’existe plus.', 404);
	return row;
}

/** La personne invitée accepte ou refuse. */
export async function answerInvite(
	membershipId: string,
	personId: string,
	accept: boolean,
	now = new Date()
) {
	const first = await prisma.membership.findUnique({
		where: { id: membershipId },
		select: { orgId: true, personId: true }
	});
	if (!first || first.personId !== personId) throw new BandError('Invitation introuvable.', 404);
	if (accept && (await countActiveBands(prisma, personId)) >= MAX_ACTIVE_BANDS) {
		throw new BandError(`Tu es déjà dans ${MAX_ACTIVE_BANDS} groupes.`);
	}
	return prisma.$transaction(async (tx) => {
		await lockBand(tx, first.orgId);
		const band = await liveBand(tx, first.orgId);
		const row = await pendingRow(tx, membershipId);
		if (row.status !== 'INVITED') throw new BandError('Cette invitation n’est plus en attente.');
		await tx.membership.update({
			where: { id: row.id },
			data: accept ? { status: 'ACTIVE', startedAt: now } : { status: 'DECLINED', endedAt: now }
		});
		if (accept) await afterJoin(tx, first.orgId, personId, now, personId);
		return band.actor;
	}, TX);
}

/** La gestion accepte ou refuse une demande. */
export async function answerRequest(
	membershipId: string,
	managerId: string,
	accept: boolean,
	now = new Date()
) {
	const first = await prisma.membership.findUnique({
		where: { id: membershipId },
		select: { orgId: true, personId: true }
	});
	if (!first) throw new BandError('Demande introuvable.', 404);
	if (accept && (await countActiveBands(prisma, first.personId)) >= MAX_ACTIVE_BANDS) {
		throw new BandError(`Cette personne est déjà dans ${MAX_ACTIVE_BANDS} groupes.`);
	}
	await prisma.$transaction(async (tx) => {
		await lockBand(tx, first.orgId);
		await liveBand(tx, first.orgId);
		await requireManager(tx, first.orgId, managerId);
		const row = await pendingRow(tx, membershipId);
		if (row.status !== 'REQUESTED') throw new BandError('Cette demande n’est plus en attente.');
		await tx.membership.update({
			where: { id: row.id },
			data: accept ? { status: 'ACTIVE', startedAt: now } : { status: 'DECLINED', endedAt: now }
		});
		if (accept) await afterJoin(tx, first.orgId, first.personId, now, managerId);
	}, TX);
}

/** Retirer une invitation (gestion) ou sa propre demande (la personne). */
export async function withdrawPending(membershipId: string, byId: string, now = new Date()) {
	const first = await prisma.membership.findUnique({
		where: { id: membershipId },
		select: { orgId: true }
	});
	if (!first) throw new BandError('Introuvable.', 404);
	await prisma.$transaction(async (tx) => {
		await lockBand(tx, first.orgId);
		const row = await pendingRow(tx, membershipId);
		if (row.status === 'REQUESTED' && row.personId !== byId) {
			throw new BandError('Seule la personne qui a demandé peut retirer sa demande.', 403);
		}
		if (row.status === 'INVITED') await requireManager(tx, row.orgId, byId);
		if (row.status !== 'INVITED' && row.status !== 'REQUESTED') {
			throw new BandError('Plus rien n’est en attente.');
		}
		await tx.membership.update({
			where: { id: row.id },
			data: { status: 'DECLINED', endedAt: now }
		});
	}, TX);
}

/** Quitter le groupe. L'OWNER seul·e le dissout ; sinon il ou elle le transmet d'abord. */
export async function leaveBand(bandId: string, personId: string, now = new Date()) {
	return prisma.$transaction(async (tx) => {
		await lockBand(tx, bandId);
		await liveBand(tx, bandId);
		const mine = await activeMembership(tx, bandId, personId);
		if (!mine) throw new BandError('Tu ne fais pas partie de ce groupe.', 404);
		const active = await tx.membership.count({ where: { orgId: bandId, status: 'ACTIVE' } });
		const check = leaveCheck(mine.role, active);
		if (!check.ok) throw new BandError(BAND_ERRORS[check.reason]);
		await tx.membership.update({
			where: { id: mine.id },
			data: { status: 'LEFT', endedAt: now }
		});
		if (check.dissolves) await dissolve(tx, bandId, now);
		return { dissolved: check.dissolves };
	}, TX);
}

/** Dissolution : invitations et demandes closes, l'historique reste. */
async function dissolve(tx: Tx, bandId: string, now: Date) {
	await tx.membership.updateMany({
		where: { orgId: bandId, status: { in: ['INVITED', 'REQUESTED'] } },
		data: { status: 'DECLINED', endedAt: now }
	});
	await tx.organization.update({ where: { actorId: bandId }, data: { dissolvedAt: now } });
}

/** Retirer un membre (OWNER : tout le monde ; ADMIN : les membres). */
export async function removeMember(membershipId: string, managerId: string, now = new Date()) {
	const first = await prisma.membership.findUnique({
		where: { id: membershipId },
		select: { orgId: true }
	});
	if (!first) throw new BandError('Membre introuvable.', 404);
	await prisma.$transaction(async (tx) => {
		await lockBand(tx, first.orgId);
		await liveBand(tx, first.orgId);
		const mine = await requireManager(tx, first.orgId, managerId);
		const row = await pendingRow(tx, membershipId);
		if (row.status !== 'ACTIVE')
			throw new BandError('Cette personne ne fait plus partie du groupe.');
		if (row.personId === managerId)
			throw new BandError('Pour partir, utilise « Quitter le groupe ».');
		if (!canRemove(mine.role, row.role)) {
			throw new BandError('Tu ne peux pas retirer cette personne du groupe.', 403);
		}
		await tx.membership.update({
			where: { id: row.id },
			data: { status: 'REMOVED', endedAt: now }
		});
	}, TX);
}

/** Changer le rôle d'un membre (OWNER seulement) : co-gestion ou membre. */
export async function setRole(
	membershipId: string,
	ownerId: string,
	role: Exclude<OrgRole, 'OWNER'>
) {
	const first = await prisma.membership.findUnique({
		where: { id: membershipId },
		select: { orgId: true }
	});
	if (!first) throw new BandError('Membre introuvable.', 404);
	await prisma.$transaction(async (tx) => {
		await lockBand(tx, first.orgId);
		await liveBand(tx, first.orgId);
		const mine = await activeMembership(tx, first.orgId, ownerId);
		if (mine?.role !== 'OWNER') {
			throw new BandError('Seule la personne responsable change les rôles.', 403);
		}
		const row = await pendingRow(tx, membershipId);
		if (row.status !== 'ACTIVE' || row.role === 'OWNER') {
			throw new BandError('Ce rôle ne peut pas changer.');
		}
		await tx.membership.update({ where: { id: row.id }, data: { role } });
	}, TX);
}

/** Transmettre le groupe : l'autre devient responsable, soi-même co-gestion. */
export async function transferOwnership(membershipId: string, ownerId: string) {
	const first = await prisma.membership.findUnique({
		where: { id: membershipId },
		select: { orgId: true }
	});
	if (!first) throw new BandError('Membre introuvable.', 404);
	await prisma.$transaction(async (tx) => {
		await lockBand(tx, first.orgId);
		await liveBand(tx, first.orgId);
		const mine = await activeMembership(tx, first.orgId, ownerId);
		if (mine?.role !== 'OWNER') {
			throw new BandError('Seule la personne responsable transmet le groupe.', 403);
		}
		const row = await pendingRow(tx, membershipId);
		if (row.status !== 'ACTIVE' || row.personId === ownerId) {
			throw new BandError('Transmets le groupe à un membre actuel.');
		}
		await tx.membership.update({ where: { id: mine.id }, data: { role: 'ADMIN' } });
		await tx.membership.update({ where: { id: row.id }, data: { role: 'OWNER' } });
	}, TX);
}

/** Modifier ce que l'on fait dans le groupe (« basse, chœurs »). */
export async function setMyTitle(bandId: string, personId: string, title: string | null) {
	const mine = await activeMembership(prisma, bandId, personId);
	if (!mine) throw new BandError('Tu ne fais pas partie de ce groupe.', 404);
	await prisma.membership.update({ where: { id: mine.id }, data: { title } });
}

// ─── Recrutement (P3-03) ─────────────────────────────────────────────────

/** Groupes que la personne gère (OWNER, ADMIN), pour publier en leur nom. */
export async function managedBands(personId: string) {
	const rows = await prisma.membership.findMany({
		where: {
			personId,
			status: 'ACTIVE',
			role: { in: ['OWNER', 'ADMIN'] },
			org: { kind: 'BAND', dissolvedAt: null, actor: { deletedAt: null } }
		},
		orderBy: { startedAt: 'asc' },
		select: {
			org: {
				select: {
					actorId: true,
					actor: {
						select: {
							handle: true,
							displayName: true,
							location: { select: { communeName: true } }
						}
					}
				}
			}
		}
	});
	return rows.map((r) => ({
		id: r.org.actorId,
		handle: r.org.actor.handle,
		name: r.org.actor.displayName,
		commune: r.org.actor.location?.communeName ?? null
	}));
}

/** Personnes qui gèrent le groupe (pour les notifications et les droits). */
export async function bandManagerIds(bandId: string, db: Tx | typeof prisma = prisma) {
	return managersOf(db as Tx, bandId);
}

/**
 * Candidature acceptée sur une annonce « cherche un membre » du groupe : la
 * personne entre dans le groupe (formation à la 2ᵉ adhésion, XP), dans la
 * transaction de l'acceptation. Une invitation ou une demande en attente
 * devient l'adhésion.
 */
export async function joinFromRecruitment(
	tx: Tx,
	input: { bandId: string; personId: string; managerId: string; title: string | null },
	now = new Date()
) {
	const { bandId, personId, managerId } = input;
	await lockBand(tx, bandId);
	await liveBand(tx, bandId);
	await requireManager(tx, bandId, managerId);
	const existing = await tx.membership.findFirst({
		where: { orgId: bandId, personId, status: open },
		select: { id: true, status: true, title: true }
	});
	if (existing?.status === 'ACTIVE') {
		throw new BandError('Cette personne fait déjà partie du groupe.');
	}
	if (!existing && (await countActiveBands(tx, personId)) >= MAX_ACTIVE_BANDS) {
		throw new BandError(`Cette personne est déjà dans ${MAX_ACTIVE_BANDS} groupes.`);
	}
	if (existing) {
		await tx.membership.update({
			where: { id: existing.id },
			data: { status: 'ACTIVE', startedAt: now, title: existing.title ?? input.title }
		});
	} else {
		await tx.membership.create({
			data: { orgId: bandId, personId, status: 'ACTIVE', startedAt: now, title: input.title }
		});
	}
	await afterJoin(tx, bandId, personId, now, managerId);
}

/** Le recrutement a besoin du délai long (événements de progression). */
export const BAND_TX = TX;

// ─── Fiche du groupe (P3-02) ─────────────────────────────────────────────

/** Ce que la gestion modifie : nom, présentation, genres, ville. */
export async function updateBandProfile(
	bandId: string,
	managerId: string,
	input: { name: string; bio: string | null; genreIds: string[]; commune: Commune | null }
) {
	const genreIds = [...new Set(input.genreIds)];
	const known = await prisma.genre.count({ where: { id: { in: genreIds }, active: true } });
	if (known !== genreIds.length)
		throw new BandError('Un genre choisi n’existe plus : recharge la page.');
	await prisma.$transaction(async (tx) => {
		await lockBand(tx, bandId);
		await liveBand(tx, bandId);
		await requireManager(tx, bandId, managerId);
		await tx.actor.update({
			where: { id: bandId },
			data: { displayName: input.name, bio: input.bio }
		});
		// Genres facultatifs pour un groupe (une personne en déclare au moins un).
		await tx.actorGenre.deleteMany({ where: { actorId: bandId } });
		await tx.actorGenre.createMany({
			data: genreIds.map((genreId) => ({ actorId: bandId, genreId }))
		});
	}, TX);
	// Comme pour une personne : seul le centre de la commune, sur une grille.
	if (input.commune) await setActorLocation(bandId, input.commune);
	else await clearActorLocation(bandId);
}

/**
 * Lien YouTube, SoundCloud ou Bandcamp au nom du groupe. Quota et
 * validation suivent la confiance de la personne qui publie. Jamais une
 * « démo » qui rapporte de l'XP : les étapes du groupe (P3-04) s'en chargent.
 */
export async function addBandMedia(
	bandId: string,
	managerId: string,
	input: { url: string; title: string }
) {
	await prisma.$transaction(async (tx) => {
		await liveBand(tx, bandId);
		await requireManager(tx, bandId, managerId);
	});
	try {
		const { media } = await addExternalMedia(
			bandId,
			{ url: input.url, title: input.title, isDemo: false, instrumentId: null },
			managerId
		);
		return media;
	} catch (err) {
		if (err instanceof MediaError) throw new BandError(err.message);
		throw err;
	}
}

export async function deleteBandMedia(bandId: string, managerId: string, mediaId: string) {
	await prisma.$transaction(async (tx) => {
		await requireManager(tx, bandId, managerId);
	});
	try {
		await deleteOwnMedia(bandId, mediaId);
	} catch (err) {
		if (err instanceof MediaError) throw new BandError(err.message, 404);
		throw err;
	}
}

// ─── Lectures ────────────────────────────────────────────────────────────

const personCard = {
	id: true,
	handle: true,
	displayName: true,
	deletedAt: true
} as const;

/** `/groupes` : mes groupes, invitations reçues, demandes envoyées. */
export async function myBands(personId: string) {
	const rows = await prisma.membership.findMany({
		where: {
			personId,
			status: open,
			org: { kind: 'BAND', dissolvedAt: null, actor: { deletedAt: null } }
		},
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			status: true,
			role: true,
			title: true,
			startedAt: true,
			invitedBy: { select: { displayName: true, deletedAt: true } },
			org: {
				select: {
					actorId: true,
					formedAt: true,
					actor: { select: { handle: true, displayName: true } },
					_count: { select: { memberships: { where: { status: 'ACTIVE' } } } }
				}
			}
		}
	});
	const toBand = (r: (typeof rows)[number]) => ({
		membershipId: r.id,
		handle: r.org.actor.handle,
		name: r.org.actor.displayName,
		formed: r.org.formedAt !== null,
		members: r.org._count.memberships,
		role: r.role,
		title: r.title,
		since: r.startedAt,
		invitedBy: r.invitedBy && !r.invitedBy.deletedAt ? r.invitedBy.displayName : null
	});
	// Rang de chaque groupe actif (P3-08).
	const active = await Promise.all(
		rows
			.filter((r) => r.status === 'ACTIVE')
			.map(async (r) => ({ ...toBand(r), tier: await bandTierOf(r.org.actorId) }))
	);
	return {
		active,
		invitations: rows.filter((r) => r.status === 'INVITED').map(toBand),
		requests: rows.filter((r) => r.status === 'REQUESTED').map(toBand)
	};
}

/** Mon parcours : nombre de groupes actifs et d'invitations reçues. */
export async function bandCounts(personId: string) {
	const live = { kind: 'BAND', dissolvedAt: null, actor: { deletedAt: null } } as const;
	const [active, invitations] = await Promise.all([
		prisma.membership.count({ where: { personId, status: 'ACTIVE', org: live } }),
		prisma.membership.count({ where: { personId, status: 'INVITED', org: live } })
	]);
	return { active, invitations };
}

/** `/groupes/[handle]` : le groupe vu par une personne connectée. */
export async function bandPage(handle: string, viewerId: string, now = new Date()) {
	const band = await prisma.organization.findFirst({
		where: { kind: 'BAND', actor: { handle, deletedAt: null } },
		select: {
			actorId: true,
			formedAt: true,
			dissolvedAt: true,
			createdAt: true,
			actor: { select: { handle: true, displayName: true, bio: true } },
			memberships: {
				where: { status: { in: ['INVITED', 'REQUESTED', 'ACTIVE', 'LEFT', 'REMOVED'] } },
				select: {
					id: true,
					status: true,
					role: true,
					title: true,
					startedAt: true,
					endedAt: true,
					createdAt: true,
					person: { select: personCard }
				}
			}
		}
	});
	if (!band) return null;
	// Blocage (P2-05) : un groupe dont une personne responsable a bloqué le
	// lecteur (ou l'inverse) ne lui est pas montré.
	const owners = band.memberships.filter((m) => m.status === 'ACTIVE' && isManager(m.role));
	for (const m of owners) {
		if (m.person.id !== viewerId && (await isBlockedBetween(viewerId, m.person.id))) return null;
	}
	const visible = await prisma.actor.findMany({
		where: { id: { in: band.memberships.map((m) => m.person.id) }, ...publicActorWhere(now) },
		select: { id: true }
	});
	const shown = new Set(visible.map((a) => a.id));
	const card = (m: (typeof band.memberships)[number]) => ({
		membershipId: m.id,
		// Un compte supprimé ou masqué reste dans l'historique, sans lien.
		handle: shown.has(m.person.id) ? m.person.handle : null,
		name: m.person.deletedAt ? 'Compte supprimé' : m.person.displayName,
		isMe: m.person.id === viewerId,
		role: m.role,
		title: m.title,
		startedAt: m.startedAt,
		endedAt: m.endedAt,
		createdAt: m.createdAt
	});
	const mine = band.memberships.find(
		(m) => m.person.id === viewerId && (OPEN_STATUSES as readonly string[]).includes(m.status)
	);
	const myRole = mine?.status === 'ACTIVE' ? mine.role : null;
	const manager = isManager(myRole);
	const active = band.memberships.filter((m) => m.status === 'ACTIVE');
	return {
		id: band.actorId,
		handle: band.actor.handle,
		name: band.actor.displayName,
		bio: band.actor.bio,
		formedAt: band.formedAt,
		dissolvedAt: band.dissolvedAt,
		createdAt: band.createdAt,
		my: mine
			? { membershipId: mine.id, status: mine.status, role: myRole, title: mine.title }
			: null,
		members: active.sort(compareMembers).map(card),
		past: band.memberships
			.filter((m) => m.status === 'LEFT' || m.status === 'REMOVED')
			.sort((a, b) => (b.endedAt?.getTime() ?? 0) - (a.endedAt?.getTime() ?? 0))
			.map(card),
		// Ce qui est en attente n'est montré qu'à la gestion.
		invitations: manager ? band.memberships.filter((m) => m.status === 'INVITED').map(card) : [],
		requests: manager ? band.memberships.filter((m) => m.status === 'REQUESTED').map(card) : []
	};
}

/**
 * Personnes à inviter en un clic : son réseau musical et ses conversations
 * acceptées, sauf celles déjà dans le groupe ou en attente.
 */
export async function inviteCandidates(bandId: string, personId: string, now = new Date()) {
	const taken = await prisma.membership.findMany({
		where: { orgId: bandId, status: open },
		select: { personId: true }
	});
	const exclude = [personId, ...taken.map((t) => t.personId)];
	const [ties, conversations] = await Promise.all([
		prisma.musicalTie.findMany({
			where: { ownerId: personId, contactId: { notIn: exclude } },
			orderBy: { createdAt: 'desc' },
			take: 12,
			select: { contactId: true }
		}),
		prisma.conversationParticipant.findMany({
			where: {
				actorId: { notIn: exclude },
				state: 'ACCEPTED',
				conversation: { participants: { some: { actorId: personId, state: 'ACCEPTED' } } }
			},
			orderBy: { conversation: { lastMessageAt: 'desc' } },
			take: 12,
			select: { actorId: true }
		})
	]);
	const ids = [
		...new Set([...ties.map((t) => t.contactId), ...conversations.map((c) => c.actorId)])
	];
	const people = await prisma.actor.findMany({
		where: { id: { in: ids }, person: { isNot: null }, ...publicActorWhere(now, personId) },
		select: { id: true, handle: true, displayName: true }
	});
	const byId = new Map(people.map((p) => [p.id, p]));
	return ids
		.flatMap((id) => {
			const p = byId.get(id);
			return p ? [{ handle: p.handle, displayName: p.displayName }] : [];
		})
		.slice(0, 12);
}
