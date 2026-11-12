/**
 * Accompagnement d'un artiste par un·e manager ou un·e booker (P5-07,
 * conception 08 §9 et §10). Seul point d'écriture de `representations`
 * (hors anonymisation). Règles pures : `#lib/representation/rules`.
 *
 * - **Proposer** : une personne majeure qui a le métier (`MANAGER` ou
 *   `BOOKER`) propose d'accompagner un artiste : une personne majeure ou un
 *   groupe dont elle ne fait pas partie (Q48, Q49). Notification
 *   `REPRESENTATION_REQUEST` à l'artiste, ou à la gestion du groupe.
 * - **Confirmer** : l'artiste, ou une personne majeure de la gestion du
 *   groupe (OWNER, ADMIN). La confirmation émet `management.confirmed` :
 *   200 au manager (rendement par artiste, confiance de qui confirme) ; rien
 *   au booker, dont les points viennent des dates (`gig.held`,
 *   `tour.booked`). **Une proposition non confirmée ne rapporte rien.**
 * - **Décliner** ou **retirer** une proposition la supprime ; **terminer**
 *   un accompagnement confirmé le garde (`ENDED`) : il compte toujours pour
 *   le rang, mais ne permet plus de booker.
 * - Rang (`getAgentTier`) : lu dans les accompagnements confirmés et les
 *   étapes des groupes, jamais l'XP (`core/agentSummary.ts`).
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { notify } from '#lib/server/notifications/service';
import { emitAndProcess } from '#lib/server/progression/processor';
import { agentSummary, type BandMilestoneFact } from '#lib/server/progression/core/agentSummary';
import { agentTier } from '#lib/server/progression/core/tiers';
import type { Milestone } from '#lib/server/progression/core/events';
import { isIndexable } from '#lib/actors/visibility';
import {
	AGENT_KIND_INFO,
	MAX_PENDING_PROPOSALS,
	representationTitle,
	type AgentKindValue,
	type RepresentationProposal
} from '#lib/representation/rules';

type Tx = Prisma.TransactionClient;
type Db = Tx | typeof prisma;

export class RepresentationError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

const TX = { timeout: 15_000 } as const;
const MANAGES = {
	status: 'ACTIVE',
	role: { in: ['OWNER', 'ADMIN'] }
} satisfies Prisma.MembershipWhereInput;

async function lockPair(tx: Tx, agentId: string, artistId: string) {
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`rep:${agentId}:${artistId}`}))`;
}

const isAdultPerson = async (db: Db, actorId: string, now: Date) => {
	const p = await db.person.findUnique({ where: { actorId }, select: { birthDate: true } });
	return isIndexable(p?.birthDate, now);
};

/** A le métier et est majeur·e (D5) : peut accompagner un artiste. */
export async function isAgent(personId: string, kind: AgentKindValue, now = new Date()) {
	const track = await prisma.personTrack.count({ where: { personId, track: kind } });
	return track > 0 && (await isAdultPerson(prisma, personId, now));
}

/** Métiers d'accompagnement de la personne (majeure), dans l'ordre du référentiel. */
export async function agentKindsOf(personId: string, now = new Date()) {
	const [tracks, adult] = await Promise.all([
		prisma.personTrack.findMany({
			where: { personId, track: { in: ['MANAGER', 'BOOKER'] } },
			select: { track: true }
		}),
		isAdultPerson(prisma, personId, now)
	]);
	if (!adult) return [];
	return (['MANAGER', 'BOOKER'] as const).filter((k) => tracks.some((t) => t.track === k));
}

/** Personnes qui répondent pour l'artiste : lui-même, ou la gestion du groupe. */
async function answerersOf(db: Db, artistId: string) {
	const actor = await db.actor.findUnique({
		where: { id: artistId },
		select: {
			kind: true,
			organization: {
				select: {
					kind: true,
					dissolvedAt: true,
					memberships: { where: MANAGES, select: { personId: true } }
				}
			}
		}
	});
	if (!actor) return [];
	if (actor.kind === 'PERSON') return [artistId];
	const org = actor.organization;
	if (!org || org.kind !== 'BAND' || org.dissolvedAt) return [];
	return org.memberships.map((m) => m.personId);
}

async function canAnswerFor(db: Db, artistId: string, personId: string, now: Date) {
	const answerers = await answerersOf(db, artistId);
	return answerers.includes(personId) && (await isAdultPerson(db, personId, now));
}

/** Proposer d'accompagner un artiste (personne ou groupe). Renvoie son nom. */
export async function proposeRepresentation(
	agentId: string,
	input: RepresentationProposal,
	now = new Date()
) {
	const { kind } = input;
	if (!(await isAgent(agentId, kind, now))) {
		throw new RepresentationError(
			`Ajoute d’abord le métier « ${AGENT_KIND_INFO[kind].label} » (réservé aux personnes majeures).`,
			403
		);
	}
	const artist = await prisma.actor.findFirst({
		where: {
			handle: input.artist.replace(/^@/, '').toLowerCase(),
			deletedAt: null,
			OR: [
				{ kind: 'PERSON' },
				{ kind: 'ORGANIZATION', organization: { kind: 'BAND', dissolvedAt: null } }
			]
		},
		select: {
			id: true,
			kind: true,
			displayName: true,
			organization: {
				select: { memberships: { where: { personId: agentId, status: 'ACTIVE' } } }
			}
		}
	});
	if (!artist) {
		throw new RepresentationError('Aucun·e artiste ni groupe n’a ce nom d’utilisateur.', 404);
	}
	if (artist.id === agentId) throw new RepresentationError('On ne s’accompagne pas soi-même.');
	if (artist.organization && artist.organization.memberships.length > 0) {
		throw new RepresentationError(
			'Tu fais partie de ce groupe : son accompagnement ne se confirme pas entre ses membres.'
		);
	}
	if (artist.kind === 'PERSON' && !(await isAdultPerson(prisma, artist.id, now))) {
		throw new RepresentationError(
			'L’accompagnement d’un·e artiste mineur·e ne passe pas par la plateforme.',
			403
		);
	}
	const answerers = await answerersOf(prisma, artist.id);
	const blocked = await Promise.all(answerers.map((id: string) => isBlockedBetween(agentId, id)));
	if (answerers.length === 0 || blocked.some(Boolean)) {
		throw new RepresentationError('Impossible de proposer un accompagnement à cet artiste.', 403);
	}
	await prisma.$transaction(async (tx) => {
		await lockPair(tx, agentId, artist.id);
		const [open, pending] = await Promise.all([
			tx.representation.findFirst({
				where: {
					agentId,
					artistId: artist.id,
					kind,
					status: { in: ['PROPOSED', 'CONFIRMED'] }
				},
				select: { status: true }
			}),
			tx.representation.count({ where: { agentId, status: 'PROPOSED' } })
		]);
		if (open) {
			throw new RepresentationError(
				open.status === 'CONFIRMED'
					? `Tu accompagnes déjà ${artist.displayName} ${AGENT_KIND_INFO[kind].as}.`
					: `Ta proposition à ${artist.displayName} attend sa réponse.`
			);
		}
		if (pending >= MAX_PENDING_PROPOSALS) {
			throw new RepresentationError(
				`${MAX_PENDING_PROPOSALS} propositions en attente au plus : attends quelques réponses.`
			);
		}
		await tx.representation.create({
			data: { agentId, artistId: artist.id, kind, message: input.message ?? null }
		});
		for (const recipientId of answerers) {
			await notify(tx, {
				recipientId,
				type: 'REPRESENTATION_REQUEST',
				fromActorId: agentId,
				href: '/accompagnement',
				title: representationTitle(artist.displayName, kind)
			});
		}
	}, TX);
	return artist.displayName;
}

/** Confirmer (pour l'artiste) ou décliner une proposition. */
export async function answerRepresentation(
	representationId: string,
	personId: string,
	accept: boolean,
	now = new Date()
) {
	const row = await prisma.representation.findUnique({
		where: { id: representationId },
		select: { agentId: true, artistId: true, kind: true, status: true }
	});
	if (!row || row.status !== 'PROPOSED') {
		throw new RepresentationError('Cette proposition n’est plus valable.', 404);
	}
	if (!(await canAnswerFor(prisma, row.artistId, personId, now))) {
		throw new RepresentationError(
			'Seul·e l’artiste, ou une personne majeure de la gestion du groupe, répond.',
			403
		);
	}
	await prisma.$transaction(async (tx) => {
		await lockPair(tx, row.agentId, row.artistId);
		const current = await tx.representation.findUnique({
			where: { id: representationId },
			select: { status: true }
		});
		if (current?.status !== 'PROPOSED') {
			throw new RepresentationError('Cette proposition n’est plus valable.', 404);
		}
		if (!accept) {
			await tx.representation.delete({ where: { id: representationId } });
			return;
		}
		if (await isBlockedBetween(row.agentId, personId)) {
			throw new RepresentationError('Impossible de confirmer cet accompagnement.', 403);
		}
		await tx.representation.update({
			where: { id: representationId },
			data: { status: 'CONFIRMED', confirmedAt: now, confirmedById: personId }
		});
		await emitAndProcess(tx, {
			type: 'management.confirmed',
			managerId: row.agentId,
			artistId: row.artistId,
			confirmedById: personId,
			kind: row.kind,
			occurredAt: now
		});
	}, TX);
}

/**
 * Retirer sa proposition (l'agent) ou terminer un accompagnement confirmé
 * (l'agent, l'artiste ou la gestion du groupe).
 */
export async function endRepresentation(representationId: string, byId: string, now = new Date()) {
	const row = await prisma.representation.findUnique({
		where: { id: representationId },
		select: { agentId: true, artistId: true, status: true }
	});
	if (!row || row.status === 'ENDED') {
		throw new RepresentationError('Cet accompagnement est déjà terminé.', 404);
	}
	const isAgentSide = row.agentId === byId;
	if (row.status === 'PROPOSED') {
		if (!isAgentSide) throw new RepresentationError('Réponds à la proposition plutôt.', 403);
		await prisma.representation.delete({ where: { id: representationId } });
		return;
	}
	if (!isAgentSide && !(await answerersOf(prisma, row.artistId)).includes(byId)) {
		throw new RepresentationError('Seules les deux parties terminent un accompagnement.', 403);
	}
	await prisma.representation.update({
		where: { id: representationId },
		data: { status: 'ENDED', endedAt: now, endedById: byId }
	});
}

// ─── Lectures ────────────────────────────────────────────────────────────

const ARTIST = { select: { id: true, handle: true, displayName: true, kind: true } } as const;

/** Mes accompagnements comme agent : en attente, en cours, terminés. */
export async function myRepresentations(agentId: string) {
	const rows = await prisma.representation.findMany({
		where: { agentId, artist: { deletedAt: null } },
		orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
		take: 100,
		select: {
			id: true,
			kind: true,
			status: true,
			confirmedAt: true,
			endedAt: true,
			artist: ARTIST
		}
	});
	return rows.map((r) => ({
		id: r.id,
		kind: r.kind,
		status: r.status,
		confirmedAt: r.confirmedAt,
		endedAt: r.endedAt,
		artist: {
			handle: r.artist.handle,
			name: r.artist.displayName,
			isBand: r.artist.kind === 'ORGANIZATION'
		}
	}));
}

/** Les groupes dont je fais partie de la gestion. */
async function bandsIManage(personId: string) {
	const rows = await prisma.membership.findMany({
		where: { personId, ...MANAGES, org: { kind: 'BAND', dissolvedAt: null } },
		select: { orgId: true }
	});
	return rows.map((r) => r.orgId);
}

/**
 * Ce qui me concerne comme artiste (moi, ou un groupe que je gère) :
 * propositions à trancher et accompagnements en cours.
 */
export async function representationsForMe(personId: string) {
	const artistIds = [personId, ...(await bandsIManage(personId))];
	const rows = await prisma.representation.findMany({
		where: {
			artistId: { in: artistIds },
			status: { in: ['PROPOSED', 'CONFIRMED'] },
			agent: { deletedAt: null }
		},
		orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
		select: {
			id: true,
			kind: true,
			status: true,
			message: true,
			confirmedAt: true,
			artist: ARTIST,
			agent: { select: { handle: true, displayName: true } }
		}
	});
	return rows.map((r) => ({
		id: r.id,
		kind: r.kind,
		status: r.status,
		message: r.status === 'PROPOSED' ? r.message : null,
		confirmedAt: r.confirmedAt,
		/** `null` : c'est moi. */
		artist: r.artist.id === personId ? null : r.artist.displayName,
		agent: { handle: r.agent.handle, name: r.agent.displayName }
	}));
}

/** Nombre de propositions qui attendent ma réponse (tableau de bord). */
export async function pendingRepresentationCount(personId: string) {
	const artistIds = [personId, ...(await bandsIManage(personId))];
	return prisma.representation.count({
		where: { artistId: { in: artistIds }, status: 'PROPOSED', agent: { deletedAt: null } }
	});
}

/**
 * Artistes accompagnés, pour le profil public : **seulement** les
 * accompagnements confirmés et en cours, d'artistes visibles.
 */
export async function confirmedArtistsOf(agentId: string, viewerId?: string) {
	const rows = await prisma.representation.findMany({
		where: {
			agentId,
			status: 'CONFIRMED',
			artist: {
				deletedAt: null,
				hidden: false,
				OR: [{ kind: 'PERSON' }, { organization: { dissolvedAt: null } }]
			}
		},
		orderBy: { confirmedAt: 'asc' },
		take: 24,
		select: { kind: true, artist: ARTIST }
	});
	// Blocage (P2-05) : un artiste bloqué avec qui regarde n'apparaît pas.
	const visible = viewerId
		? (
				await Promise.all(
					rows.map(async (r) => ((await isBlockedBetween(viewerId, r.artist.id)) ? null : r))
				)
			).filter((r) => r !== null)
		: rows;
	return visible.map((r) => ({
		kind: r.kind,
		handle: r.artist.handle,
		name: r.artist.displayName,
		isBand: r.artist.kind === 'ORGANIZATION'
	}));
}

/**
 * Bookers confirmé·es et en cours des groupes (formulaire de concert) :
 * « Booké par » ne propose qu'eux.
 */
export async function confirmedBookersOf(bandIds: readonly string[]) {
	if (bandIds.length === 0) return new Map<string, { handle: string; name: string }[]>();
	const rows = await prisma.representation.findMany({
		where: {
			artistId: { in: [...bandIds] },
			kind: 'BOOKER',
			status: 'CONFIRMED',
			agent: { deletedAt: null }
		},
		orderBy: { confirmedAt: 'asc' },
		select: { artistId: true, agent: { select: { handle: true, displayName: true } } }
	});
	const map = new Map<string, { handle: string; name: string }[]>();
	for (const r of rows) {
		const list = map.get(r.artistId) ?? [];
		list.push({ handle: r.agent.handle, name: r.agent.displayName });
		map.set(r.artistId, list);
	}
	return map;
}

/** Le booker confirmé et en cours du groupe qui a ce nom d'utilisateur, sinon `null`. */
export async function confirmedBookerOf(db: Db, bandId: string, handle: string) {
	const row = await db.representation.findFirst({
		where: {
			artistId: bandId,
			kind: 'BOOKER',
			status: 'CONFIRMED',
			agent: { handle, deletedAt: null }
		},
		select: { agentId: true }
	});
	return row?.agentId ?? null;
}

/** L'accompagnement de booker est-il confirmé et en cours ? */
export async function isConfirmedBooker(db: Db, agentId: string, bandId: string) {
	return (
		(await db.representation.count({
			where: { agentId, artistId: bandId, kind: 'BOOKER', status: 'CONFIRMED' }
		})) > 0
	);
}

/** Faits du rang : accompagnements confirmés (en cours ou finis) et étapes des groupes. */
export async function agentFacts(agentId: string, now = new Date()) {
	const reps = await prisma.representation.findMany({
		where: { agentId, confirmedAt: { not: null } },
		select: { artistId: true, confirmedAt: true, endedAt: true }
	});
	const milestones = await prisma.milestone.findMany({
		where: {
			bandId: { in: [...new Set(reps.map((r) => r.artistId))] },
			frozenAt: null,
			proof: { in: ['CORROBORATED', 'VERIFIED'] }
		},
		select: { bandId: true, definitionId: true, proof: true, occurredAt: true }
	});
	const byBand = new Map<string, BandMilestoneFact[]>();
	for (const m of milestones) {
		const list = byBand.get(m.bandId) ?? [];
		list.push({
			milestone: m.definitionId as Milestone,
			status: m.proof,
			occurredAt: m.occurredAt
		});
		byBand.set(m.bandId, list);
	}
	// La formation est automatique : un groupe accompagné a toujours son rang « Projet ».
	const bands = await prisma.organization.findMany({
		where: { actorId: { in: [...new Set(reps.map((r) => r.artistId))] }, kind: 'BAND' },
		select: { actorId: true, formedAt: true, createdAt: true }
	});
	for (const b of bands) {
		const list = byBand.get(b.actorId) ?? [];
		if (!list.some((m) => m.milestone === 'FORMATION')) {
			list.push({
				milestone: 'FORMATION',
				status: 'VERIFIED',
				occurredAt: b.formedAt ?? b.createdAt
			});
		}
		byBand.set(b.actorId, list);
	}
	return agentSummary(
		reps.map((r) => ({ artistId: r.artistId, confirmedAt: r.confirmedAt!, endedAt: r.endedAt })),
		byBand,
		now
	);
}

/** Rang de manager ou de booker (profil public) : des faits, jamais l'XP. */
export async function getAgentTier(agentId: string, now = new Date()) {
	return agentTier(await agentFacts(agentId, now)).tier;
}
