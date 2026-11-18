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
 * - **Décliner** ou **retirer** conserve la décision sans ses termes privés ; **terminer**
 *   un accompagnement confirmé le garde (`ENDED`) : il compte toujours pour
 *   le rang, mais ne permet plus de booker.
 * - Rang (`getAgentTier`) : lu dans les accompagnements confirmés et les
 *   étapes des groupes, jamais l'XP (`core/agentSummary.ts`).
 */
import { delegatedEndAccess } from './delegationAccess';
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { notBlockedWith } from '#lib/server/actors/visibility';
import { isBlockedBetween } from '#lib/server/blocking/service';
import { notify } from '#lib/server/notifications/service';
import { emitAndProcess } from '#lib/server/progression/processor';
import { agentSummary, type BandMilestoneFact } from '#lib/server/progression/core/agentSummary';
import { agentTier } from '#lib/server/progression/core/tiers';
import type { Milestone } from '#lib/server/progression/core/events';
import { adultBirthCutoff, isIndexable } from '#lib/actors/visibility';
import {
	AGENT_KIND_INFO,
	MAX_PENDING_PROPOSALS,
	representationTitle,
	mandateScopeSchema,
	defaultMandateAction,
	mandateAllows,
	type MandateScope,
	type AgentKindValue,
	type RepresentationProposal
} from '#lib/representation/rules';

type Tx = Prisma.TransactionClient;
type Db = Tx | typeof prisma;
function currentMandate(now = new Date()): Prisma.RepresentationWhereInput {
	return {
		AND: [
			{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
			{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
		]
	};
}
const SCOPE = {
	startsAt: true,
	expiresAt: true,
	departmentCodes: true,
	allowedActions: true
} as const;
async function lockArtist(tx: Tx, artistId: string) {
	// Même verrou que les mutations d’adhésion : droits relus après attente.
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`band:${artistId}`}))`;
}
async function liveAgent(db: Db, agentId: string, kind: AgentKindValue, now: Date) {
	return (
		(await db.actor.count({ where: { id: agentId, deletedAt: null } })) > 0 &&
		(await db.personTrack.count({ where: { personId: agentId, track: kind } })) > 0 &&
		(await isAdultPerson(db, agentId, now))
	);
}
async function requireEligiblePair(
	db: Db,
	agentId: string,
	artistId: string,
	kind: AgentKindValue,
	now: Date
) {
	if (!(await liveAgent(db, agentId, kind, now)))
		throw new RepresentationError('Le métier et la majorité de l’agent doivent être valides.', 403);
	const actor = await db.actor.findFirst({
		where: { id: artistId, deletedAt: null },
		select: { kind: true }
	});
	if (!actor || (actor.kind === 'PERSON' && !(await isAdultPerson(db, artistId, now))))
		throw new RepresentationError('Artiste indisponible.', 403);
	if (
		await db.membership.count({ where: { personId: agentId, orgId: artistId, status: 'ACTIVE' } })
	)
		throw new RepresentationError('Tu fais partie de ce groupe.', 403);
	const answerers = await adultAnswerersOf(db, artistId, now);
	const blocked = await db.block.count({
		where: {
			OR: [
				{ blockerActorId: agentId, blockedActorId: { in: answerers } },
				{ blockedActorId: agentId, blockerActorId: { in: answerers } }
			]
		}
	});
	if (!answerers.length || blocked)
		throw new RepresentationError('Impossible de confirmer cet accompagnement.', 403);
	return answerers;
}

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

/** Une décision conserve seulement le contexte et ses auteurs, aucun terme privé. */
const CLOSED_PROPOSAL = {
	message: null,
	startsAt: null,
	expiresAt: null,
	departmentCodes: [],
	allowedActions: []
} satisfies Prisma.RepresentationUpdateInput;

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
		where: { id: artistId, deletedAt: null },
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

/**
 * Celles et ceux qui peuvent **confirmer** (Q48) : l'artiste, ou les
 * personnes **majeures** de la gestion du groupe. Une proposition n'est
 * adressée, notifiée et montrée qu'à elles ; un groupe géré seulement par
 * des mineur·es n'en reçoit pas (défaut trouvé en DASH-20a).
 */
async function adultAnswerersOf(db: Db, artistId: string, now: Date) {
	const answerers = await answerersOf(db, artistId);
	if (answerers.length === 0) return [];
	const adults = await db.person.findMany({
		where: { actorId: { in: answerers }, birthDate: { lte: adultBirthCutoff(now) } },
		select: { actorId: true }
	});
	return adults.map((a) => a.actorId);
}

async function canAnswerFor(db: Db, artistId: string, personId: string, now: Date) {
	return (await adultAnswerersOf(db, artistId, now)).includes(personId);
}

/** Proposer d'accompagner un artiste (personne ou groupe). Renvoie son nom. */
export async function proposeRepresentation(
	agentId: string,
	input: RepresentationProposal,
	now = new Date(),
	scope?: MandateScope
) {
	const parsedScope = mandateScopeSchema.safeParse(
		scope ?? { allowedActions: [defaultMandateAction(input.kind)] }
	);
	if (!parsedScope.success)
		throw new RepresentationError(parsedScope.error.issues[0]?.message ?? 'Périmètre invalide.');
	const terms = parsedScope.data;
	if (terms.allowedActions.some((a) => a !== defaultMandateAction(input.kind)))
		throw new RepresentationError('Cette activité ne correspond pas au métier.');
	if (terms.expiresOn && new Date(terms.expiresOn) <= now)
		throw new RepresentationError('L’échéance doit être future.');
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
	const answerers = await adultAnswerersOf(prisma, artist.id, now);
	const blocked = await Promise.all(answerers.map((id: string) => isBlockedBetween(agentId, id)));
	if (answerers.length === 0 || blocked.some(Boolean)) {
		throw new RepresentationError('Impossible de proposer un accompagnement à cet artiste.', 403);
	}
	await prisma.$transaction(async (tx) => {
		await lockArtist(tx, artist.id);
		await lockPair(tx, agentId, artist.id);
		// Quota commun aux propositions vers plusieurs artistes.
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`rep-agent:${agentId}`}))`;
		const recipients = await requireEligiblePair(tx, agentId, artist.id, kind, now);
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
			data: {
				agentId,
				artistId: artist.id,
				kind,
				message: input.message ?? null,
				startsAt: terms.startsOn ? new Date(terms.startsOn) : null,
				expiresAt: terms.expiresOn ? new Date(terms.expiresOn) : null,
				departmentCodes: [...new Set(terms.departmentCodes)],
				allowedActions: terms.allowedActions
			}
		});
		for (const recipientId of recipients) {
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
		await lockArtist(tx, row.artistId);
		await lockPair(tx, row.agentId, row.artistId);
		if (!(await canAnswerFor(tx, row.artistId, personId, now)))
			throw new RepresentationError('Seule la gestion actuelle peut répondre.', 403);
		const current = await tx.representation.findUnique({
			where: { id: representationId },
			select: { status: true, expiresAt: true }
		});
		if (current?.status !== 'PROPOSED') {
			throw new RepresentationError('Cette proposition n’est plus valable.', 404);
		}
		if (!accept) {
			await tx.representation.update({
				where: { id: representationId },
				data: { status: 'DECLINED', endedAt: now, endedById: personId, ...CLOSED_PROPOSAL }
			});
			return;
		}
		await requireEligiblePair(tx, row.agentId, row.artistId, row.kind, now);
		if (current.expiresAt && current.expiresAt <= now)
			throw new RepresentationError('Cette proposition a expiré.');
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
	if (!row || !['PROPOSED', 'CONFIRMED'].includes(row.status)) {
		throw new RepresentationError('Cet accompagnement est déjà terminé.', 404);
	}
	await prisma.$transaction(async (tx) => {
		await lockArtist(tx, row.artistId);
		await lockPair(tx, row.agentId, row.artistId);
		const current = await tx.representation.findUnique({ where: { id: representationId } });
		if (!current || !['PROPOSED', 'CONFIRMED'].includes(current.status))
			throw new RepresentationError('Cet accompagnement est déjà terminé.', 404);
		const isAgentSide = current.agentId === byId;
		if (current.status === 'PROPOSED') {
			if (!isAgentSide) throw new RepresentationError('Réponds à la proposition plutôt.', 403);
			await tx.representation.update({
				where: { id: representationId },
				data: { status: 'WITHDRAWN', endedAt: now, endedById: byId, ...CLOSED_PROPOSAL }
			});
			return;
		}
		if (
			!isAgentSide &&
			!(await answerersOf(tx, current.artistId)).includes(byId) &&
			!(await delegatedEndAccess(tx, representationId, byId, now))
		)
			throw new RepresentationError('Seules les deux parties terminent un accompagnement.', 403);
		await tx.representation.update({
			where: { id: representationId },
			data: { status: 'ENDED', endedAt: now, endedById: byId }
		});
	}, TX);
}

// ─── Lectures ────────────────────────────────────────────────────────────

const ARTIST = { select: { id: true, handle: true, displayName: true, kind: true } } as const;

/** Mes accompagnements comme agent : en attente, en cours, terminés. */
export async function myRepresentations(agentId: string) {
	const rows = await prisma.representation.findMany({
		where: {
			agentId,
			status: { in: ['PROPOSED', 'CONFIRMED', 'ENDED'] },
			artist: { deletedAt: null }
		},
		orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
		take: 100,
		select: {
			id: true,
			...SCOPE,
			kind: true,
			status: true,
			confirmedAt: true,
			endedAt: true,
			artist: ARTIST
		}
	});
	return rows.map((r) => ({
		id: r.id,
		startsAt: r.startsAt,
		expiresAt: r.expiresAt,
		departmentCodes: r.departmentCodes,
		allowedActions: r.allowedActions,
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
export async function representationsForMe(personId: string, now = new Date()) {
	const bands = await bandsIManage(personId);
	const artistIds = [personId, ...bands];
	// Une proposition attend une réponse majeure (Q48) : un·e mineur·e de la
	// gestion ne la voit pas, ni ses termes ; il ou elle voit les
	// accompagnements confirmés du groupe et peut y mettre fin.
	const answerFor = (await isAdultPerson(prisma, personId, now)) ? artistIds : [personId];
	const rows = await prisma.representation.findMany({
		where: {
			agent: { deletedAt: null },
			OR: [
				// Consenti, l'accompagnement reste lisible malgré un blocage pour qu'on puisse y
				// mettre fin (le blocage coupe déjà ses droits) ; jamais ses termes privés.
				{ artistId: { in: artistIds }, status: 'CONFIRMED' },
				// #85 : comme `pendingRepresentations`, aucune proposition d'une personne qui
				// m'a bloqué·e ou que j'ai bloquée — ni son nom, ni son pseudo, ni son message.
				{ artistId: { in: answerFor }, status: 'PROPOSED', agent: notBlockedWith(personId) }
			]
		},
		orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
		select: {
			id: true,
			...SCOPE,
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
		startsAt: r.startsAt,
		expiresAt: r.expiresAt,
		departmentCodes: r.departmentCodes,
		allowedActions: r.allowedActions,
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
export async function pendingRepresentationCount(personId: string, now = new Date()) {
	return (await pendingRepresentations(personId, now)).length;
}

/**
 * Propositions d'accompagnement qui attendent ma réponse (majeur·e, Q48),
 * pour moi ou un groupe que je gère. U0 : jamais d'une personne qui m'a
 * bloqué·e ou que j'ai bloquée.
 */
export async function pendingRepresentations(personId: string, now = new Date()) {
	if (!(await isAdultPerson(prisma, personId, now))) return [];
	const artistIds = [personId, ...(await bandsIManage(personId))];
	return prisma.representation.findMany({
		where: {
			artistId: { in: artistIds },
			status: 'PROPOSED',
			agent: { deletedAt: null, ...notBlockedWith(personId) }
		},
		orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
		select: { id: true, createdAt: true }
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
			...currentMandate(),
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
			...currentMandate(),
			allowedActions: { has: 'BOOKING_CREDIT' },
			kind: 'BOOKER',
			status: 'CONFIRMED',
			agent: { deletedAt: null }
		},
		orderBy: { confirmedAt: 'asc' },
		select: {
			artistId: true,
			agentId: true,
			agent: { select: { handle: true, displayName: true } }
		}
	});
	const map = new Map<string, { handle: string; name: string }[]>();
	for (const r of rows) {
		if (!(await currentBookerMandate(prisma, r.artistId, r.agent.handle, new Date()))) continue;
		const list = map.get(r.artistId) ?? [];
		list.push({ handle: r.agent.handle, name: r.agent.displayName });
		map.set(r.artistId, list);
	}
	return map;
}

/** Le booker confirmé et en cours du groupe qui a ce nom d'utilisateur, sinon `null`. */
async function currentBookerMandate(db: Db, bandId: string, handle: string, now: Date) {
	const row = await db.representation.findFirst({
		where: {
			...currentMandate(now),
			allowedActions: { has: 'BOOKING_CREDIT' },
			artistId: bandId,
			kind: 'BOOKER',
			status: 'CONFIRMED',
			agent: { handle, deletedAt: null }
		},
		select: { agentId: true, ...SCOPE }
	});
	if (!row || !(await liveAgent(db, row.agentId, 'BOOKER', now))) return null;
	if (
		!(await db.organization.count({
			where: { actorId: bandId, kind: 'BAND', dissolvedAt: null, actor: { deletedAt: null } }
		}))
	)
		return null;
	const answerers = await answerersOf(db, bandId);
	if (
		await db.block.count({
			where: {
				OR: [
					{ blockerActorId: row.agentId, blockedActorId: { in: answerers } },
					{ blockedActorId: row.agentId, blockerActorId: { in: answerers } }
				]
			}
		})
	)
		return null;
	return row;
}

/** Autorisation d’attribution : date et territoire obligatoires, relus côté serveur. */
export async function confirmedBookerOf(
	db: Db,
	bandId: string,
	handle: string,
	context: { on: Date; departmentCode: string | null },
	now = new Date()
) {
	const row = await currentBookerMandate(db, bandId, handle, now);
	if (
		!row ||
		!mandateAllows(row, 'BOOKING_CREDIT', now, context.departmentCode) ||
		!mandateAllows(row, 'BOOKING_CREDIT', context.on, context.departmentCode)
	)
		return null;
	return row.agentId;
}

/** L'accompagnement de booker est-il confirmé et en cours ? */
export async function isConfirmedBooker(
	db: Db,
	agentId: string,
	bandId: string,
	context: { on: Date; departmentCode: string | null },
	now = new Date()
) {
	const agent = await db.actor.findUnique({ where: { id: agentId }, select: { handle: true } });
	return !!agent && (await confirmedBookerOf(db, bandId, agent.handle, context, now)) === agentId;
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
