/**
 * Droit de candidater pour autrui (DASH-07a, D71, conception 18). Seul point
 * d'écriture de `application_grants` et `application_grant_acts` (hors
 * anonymisation). Règles pures : `#lib/representation/applicationGrants`.
 *
 * - **Demander** : l'agent titulaire d'un mandat confirmé et en cours.
 * - **Accorder / refuser** : l'artiste majeur·e, ou la gestion majeure du
 *   groupe (`artistAnswerers`).
 * - **Retirer** (demande en attente, l'agent) ou **révoquer** (droit accordé,
 *   l'une ou l'autre partie).
 *
 * Chaque geste prend le verrou de l'artiste puis celui de la paire, dans
 * l'ordre des mandats (`representation/service`), relit le droit et le mandat
 * après attente et écrit son acte dans la même transaction. Le mandat n'est
 * jamais une autorisation de candidater à lui seul.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { notify } from '#lib/server/notifications/service';
import { isIndexable } from '#lib/actors/visibility';
import { defaultMandateAction, type AgentKindValue } from '#lib/representation/rules';
import {
	grantableKinds,
	grantAllows,
	grantEndProblem,
	grantRequestSchema,
	grantState,
	GRANT_ACT_LABELS,
	type GrantActKind,
	type GrantKind
} from '#lib/representation/applicationGrants';
import { artistAnswerers } from './delegationAccess';
import { RepresentationError } from './service';

type Tx = Prisma.TransactionClient;
type Db = Tx | typeof prisma;
const TX = { timeout: 15_000 } as const;

async function lock(tx: Tx, agentId: string, artistId: string) {
	// Même ordre que les mandats : artiste (verrou des adhésions), puis paire.
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`band:${artistId}`}))`;
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`rep:${agentId}:${artistId}`}))`;
}

const mandateSelect = {
	id: true,
	agentId: true,
	artistId: true,
	kind: true,
	status: true,
	startsAt: true,
	expiresAt: true,
	allowedActions: true,
	agent: {
		select: { deletedAt: true, displayName: true, person: { select: { birthDate: true } } }
	},
	artist: { select: { kind: true, displayName: true, handle: true } }
} as const satisfies Prisma.RepresentationSelect;
type MandateRow = Prisma.RepresentationGetPayload<{ select: typeof mandateSelect }>;

/**
 * Le mandat permet-il encore un droit de candidater ? Relu sans cache :
 * confirmé et en cours, activité du métier, agent vivant, majeur·e et de ce
 * métier, artiste disponible (personne majeure ou groupe géré par des
 * majeur·es), agent hors du groupe, aucun blocage avec qui répond.
 * Renvoie les personnes qui répondent pour l'artiste, ou `null`.
 */
async function mandateUsable(db: Db, m: MandateRow, now: Date): Promise<string[] | null> {
	if (
		m.status !== 'CONFIRMED' ||
		(m.startsAt && m.startsAt > now) ||
		(m.expiresAt && m.expiresAt <= now) ||
		!m.allowedActions.includes(defaultMandateAction(m.kind)) ||
		m.agent.deletedAt ||
		!isIndexable(m.agent.person?.birthDate, now)
	)
		return null;
	if (!(await db.personTrack.count({ where: { personId: m.agentId, track: m.kind } }))) return null;
	const answerers = await artistAnswerers(db, m.artistId, now);
	if (!answerers.length) return null;
	if (
		await db.membership.count({
			where: { orgId: m.artistId, personId: m.agentId, status: 'ACTIVE' }
		})
	)
		return null;
	const blocked = await db.block.count({
		where: {
			OR: [
				{ blockerActorId: m.agentId, blockedActorId: { in: answerers } },
				{ blockedActorId: m.agentId, blockerActorId: { in: answerers } }
			]
		}
	});
	return blocked ? null : answerers;
}

const artistKindOf = (m: MandateRow): 'PERSON' | 'BAND' =>
	m.artist.kind === 'PERSON' ? 'PERSON' : 'BAND';

async function act(tx: Tx, grantId: string, kind: GrantActKind, byId: string, now: Date) {
	await tx.applicationGrantAct.create({ data: { grantId, kind, byId, createdAt: now } });
}

async function tell(tx: Tx, to: string[], fromId: string, m: MandateRow, verb: string) {
	for (const recipientId of new Set(to)) {
		if (recipientId === fromId) continue;
		await notify(tx, {
			recipientId,
			type: 'APPLICATION_GRANT',
			fromActorId: fromId,
			href: `/accompagnement/${m.id}/candidatures`,
			title: `${verb} pour ${m.artist.displayName}`
		});
	}
}

/** Demander le droit de candidater au nom de l'artiste d'un mandat. */
export async function requestGrant(agentId: string, input: unknown, now = new Date()) {
	const parsed = grantRequestSchema.safeParse(input);
	if (!parsed.success)
		throw new RepresentationError(parsed.error.issues[0]?.message ?? 'Vérifie la demande.');
	const { representationId, kinds, expiresOn } = parsed.data;
	const first = await prisma.representation.findUnique({
		where: { id: representationId },
		select: { agentId: true, artistId: true }
	});
	if (!first || first.agentId !== agentId)
		throw new RepresentationError('Accompagnement introuvable.', 404);
	return prisma.$transaction(async (tx) => {
		await lock(tx, first.agentId, first.artistId);
		const m = await tx.representation.findUniqueOrThrow({
			where: { id: representationId },
			select: mandateSelect
		});
		const answerers = await mandateUsable(tx, m, now);
		if (!answerers)
			throw new RepresentationError(
				'Il faut un accompagnement confirmé et en cours pour demander ce droit.',
				403
			);
		const allowed = grantableKinds(artistKindOf(m), m.kind as AgentKindValue);
		if (!allowed.length)
			throw new RepresentationError(
				'Un booker candidate pour un groupe, à des plateaux : rien à demander ici.',
				403
			);
		if (kinds.some((k) => !allowed.includes(k)))
			throw new RepresentationError('Ce type d’annonce ne peut pas être couvert ici.');
		const expiresAt = new Date(expiresOn);
		const problem = grantEndProblem(expiresAt, now, m.expiresAt);
		if (problem) throw new RepresentationError(problem);
		const open = await tx.applicationGrant.findMany({
			where: { representationId, endedAt: null, expiresAt: { gt: now } },
			select: { id: true }
		});
		if (open.length)
			throw new RepresentationError(
				'Un droit est déjà demandé ou accordé : retire-le avant d’en demander un autre.'
			);
		const grant = await tx.applicationGrant.create({
			data: {
				representationId,
				kinds: [...new Set(kinds)],
				expiresAt,
				requestedById: agentId,
				createdAt: now
			},
			select: { id: true }
		});
		await act(tx, grant.id, 'REQUESTED', agentId, now);
		await tell(tx, answerers, agentId, m, 'demandé');
		return grant.id;
	}, TX);
}

async function mutate(
	grantId: string,
	fn: (
		tx: Tx,
		grant: {
			id: string;
			grantedAt: Date | null;
			endedAt: Date | null;
			kinds: string[];
			expiresAt: Date;
		},
		m: MandateRow
	) => Promise<void>
) {
	const first = await prisma.applicationGrant.findUnique({
		where: { id: grantId },
		select: { representation: { select: { agentId: true, artistId: true } } }
	});
	if (!first) throw new RepresentationError('Droit introuvable.', 404);
	await prisma.$transaction(async (tx) => {
		await lock(tx, first.representation.agentId, first.representation.artistId);
		const grant = await tx.applicationGrant.findUniqueOrThrow({
			where: { id: grantId },
			select: {
				id: true,
				grantedAt: true,
				endedAt: true,
				kinds: true,
				expiresAt: true,
				representation: { select: mandateSelect }
			}
		});
		if (grant.endedAt) throw new RepresentationError('Ce droit est déjà terminé.');
		await fn(tx, grant, grant.representation);
	}, TX);
}

/** L'artiste (ou la gestion du groupe) accorde ou refuse une demande. */
export async function answerGrant(
	grantId: string,
	byId: string,
	accept: boolean,
	now = new Date()
) {
	await mutate(grantId, async (tx, g, m) => {
		if (!(await artistAnswerers(tx, m.artistId, now)).includes(byId))
			throw new RepresentationError(
				'Seul·e l’artiste ou la gestion majeure du groupe répond.',
				403
			);
		if (g.grantedAt) throw new RepresentationError('Ce droit est déjà accordé.');
		if (!accept) {
			await tx.applicationGrant.update({
				where: { id: g.id },
				data: { endedAt: now, endedById: byId }
			});
			await act(tx, g.id, 'DECLINED', byId, now);
			await tell(tx, [m.agentId], byId, m, 'refusé');
			return;
		}
		if (now >= g.expiresAt)
			throw new RepresentationError('Cette demande est échue : l’agent peut en refaire une.');
		const answerers = await mandateUsable(tx, m, now);
		if (!answerers)
			throw new RepresentationError('Cet accompagnement ne permet plus d’accorder ce droit.', 403);
		// La durée se compte depuis l'accord, dans le mandat.
		const problem = grantEndProblem(g.expiresAt, now, m.expiresAt);
		if (problem) throw new RepresentationError(problem);
		await tx.applicationGrant.update({
			where: { id: g.id },
			data: { grantedAt: now, grantedById: byId }
		});
		await act(tx, g.id, 'GRANTED', byId, now);
		await tell(tx, [m.agentId, ...answerers], byId, m, 'accordé');
	});
}

/**
 * Mettre fin : l'agent retire sa demande en attente ; une fois accordé,
 * l'agent ou l'artiste (sa gestion) révoque. Toujours possible, même si le
 * mandat est déjà inactif : finir un droit ne demande aucun droit.
 */
export async function endGrant(grantId: string, byId: string, now = new Date()) {
	await mutate(grantId, async (tx, g, m) => {
		const answerers = await artistAnswerers(tx, m.artistId, now);
		const isAgent = byId === m.agentId;
		if (!isAgent && !answerers.includes(byId))
			throw new RepresentationError('Seules les parties concernées mettent fin à ce droit.', 403);
		if (!g.grantedAt && !isAgent)
			throw new RepresentationError('Réponds à la demande : accorder ou refuser.');
		const kind: GrantActKind = g.grantedAt ? 'REVOKED' : 'WITHDRAWN';
		await tx.applicationGrant.update({
			where: { id: g.id },
			data: { endedAt: now, endedById: byId }
		});
		await act(tx, g.id, kind, byId, now);
		await tell(
			tx,
			isAgent ? answerers : [m.agentId],
			byId,
			m,
			kind === 'REVOKED' ? 'révoqué' : 'retiré'
		);
	});
}

/**
 * DASH-07b : le droit actif de cet agent pour cet artiste et ce type
 * d'annonce, mandat relu. À appeler **sous le verrou** de l'artiste et de la
 * paire (`lockGrantPair`), dans la transaction de la candidature.
 */
export async function usableGrant(
	tx: Tx,
	agentId: string,
	artistId: string,
	kind: string,
	now: Date
): Promise<string | null> {
	const rows = await tx.applicationGrant.findMany({
		where: {
			endedAt: null,
			grantedAt: { not: null },
			expiresAt: { gt: now },
			representation: { agentId, artistId }
		},
		select: {
			id: true,
			kinds: true,
			expiresAt: true,
			grantedAt: true,
			endedAt: true,
			representation: { select: mandateSelect }
		}
	});
	for (const g of rows) {
		if (!grantAllows(g, kind, now)) continue;
		if (
			!grantableKinds(
				artistKindOf(g.representation),
				g.representation.kind as AgentKindValue
			).includes(kind as GrantKind)
		)
			continue;
		if (await mandateUsable(tx, g.representation, now)) return g.id;
	}
	return null;
}

/** Verrous d'une candidature déléguée, dans l'ordre des mandats. */
export const lockGrantPair = lock;

/** Le droit vu par l'agent ou l'artiste (sa gestion) d'un mandat, avec ses actes. */
export async function grantsForRepresentation(
	representationId: string,
	viewerId: string,
	now = new Date()
) {
	const m = await prisma.representation.findUnique({
		where: { id: representationId },
		select: mandateSelect
	});
	if (!m) return null;
	const answerers = await artistAnswerers(prisma, m.artistId, now);
	const isAgent = m.agentId === viewerId;
	const isArtist = answerers.includes(viewerId);
	if (!isAgent && !isArtist) return null;
	const usable = Boolean(await mandateUsable(prisma, m, now));
	const rows = await prisma.applicationGrant.findMany({
		where: { representationId },
		orderBy: { createdAt: 'desc' },
		take: 20,
		select: {
			id: true,
			kinds: true,
			expiresAt: true,
			grantedAt: true,
			endedAt: true,
			createdAt: true,
			grantedBy: { select: { displayName: true } },
			endedBy: { select: { displayName: true } },
			acts: {
				orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
				select: { id: true, kind: true, createdAt: true, by: { select: { displayName: true } } }
			}
		}
	});
	const grants = rows.map((g) => {
		const state = grantState(g, now);
		return {
			id: g.id,
			kinds: g.kinds,
			expiresAt: g.expiresAt,
			grantedAt: g.grantedAt,
			grantedBy: g.grantedAt ? (g.grantedBy?.displayName ?? 'Compte supprimé') : null,
			endedAt: g.endedAt,
			endedBy: g.endedAt ? (g.endedBy?.displayName ?? 'Compte supprimé') : null,
			state,
			/** Accordé mais mandat inactif : sans effet tant que le mandat ne l'est plus. */
			effective: state === 'ACTIVE' && usable,
			canAnswer: isArtist && state === 'PENDING' && usable,
			canDecline: isArtist && state === 'PENDING',
			canEnd: (state === 'ACTIVE' || (state === 'PENDING' && isAgent)) && (isAgent || isArtist),
			acts: g.acts.map((a) => ({
				id: a.id,
				label: GRANT_ACT_LABELS[a.kind as GrantActKind],
				at: a.createdAt,
				by: a.by?.displayName ?? 'Compte supprimé'
			}))
		};
	});
	const open = grants.some((g) => g.state === 'PENDING' || g.state === 'ACTIVE');
	return {
		representationId: m.id,
		artistName: m.artist.displayName,
		agentName: m.agent.displayName,
		agentKind: m.kind as AgentKindValue,
		mandateEnd: m.expiresAt,
		usable,
		isAgent,
		isArtist,
		grantable: grantableKinds(artistKindOf(m), m.kind as AgentKindValue),
		canRequest: isAgent && usable && !open,
		grants
	};
}
