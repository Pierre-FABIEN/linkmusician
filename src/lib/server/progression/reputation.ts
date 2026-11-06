/**
 * Réputation (P2-08) : faits lus en base, score calculé par le noyau pur
 * (`core/reputation.ts`), projection `ReputationSnapshot` reconstructible.
 * Recalculée après chaque événement qui la touche (`processor.ts`), chaque
 * nuit (`/api/jobs/reputation`, la réactivité change sans événement) et à la
 * demande (première lecture d'un profil sans carte).
 *
 * L'XP n'entre jamais dans ce calcul : ce module ne lit ni le registre ni les
 * projections d'XP (un test le vérifie). Le score interne ne sort d'ici que
 * vers la base : `getPublicReputation` ne le lit même pas.
 *
 * Imports relatifs : utilisé aussi hors SvelteKit (tests d'intégration).
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { JAM_QUALITY_LABELS } from '../../jam/afterJam';
import { COLLAB_QUALITY_LABELS } from '../../collaborations/endorse';
import type { DomainEventType } from './core/events';
import {
	EMPTY_REPUTATION,
	internalScore,
	publicReputation,
	responseBucket,
	RESPONSE_WINDOW_DAYS,
	UNANSWERED_AFTER_DAYS,
	type PublicReputation,
	type ReputationFacts,
	type ResponseBucket
} from './core/reputation';
import { DAY_MS } from './core/types';
import { getMusicianTier } from './read';
import type { Tx } from './events';

/** Événements qui changent la carte de réputation des acteurs concernés. */
export const REPUTATION_EVENTS: ReadonlySet<DomainEventType> = new Set<DomainEventType>([
	'conversation.reciprocated',
	'membership.accepted',
	'collaboration.completed',
	'endorsement.received',
	'endorsement.revoked',
	'milestone.attested'
]);

const HOUR_MS = 3_600_000;

/** Appréciations actives reçues, par libellé (jams et collaborations confondues). */
async function endorsementsByKind(tx: Tx, actorId: string) {
	const where = { toActorId: actorId, revokedAt: null };
	const select = { quality: true, instrument: { select: { name: true } } } as const;
	const [jams, collabs] = await Promise.all([
		tx.jamEndorsement.findMany({ where, select }),
		tx.collabEndorsement.findMany({ where, select })
	]);
	const labels = [
		...jams.map((r) => (r.quality ? JAM_QUALITY_LABELS[r.quality] : r.instrument?.name)),
		...collabs.map((r) => (r.quality ? COLLAB_QUALITY_LABELS[r.quality] : r.instrument?.name))
	];
	const counts = new Map<string, number>();
	for (const raw of labels) {
		const label = raw?.toLowerCase();
		if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([label, count]) => ({ label, count }))
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * Délais de réponse aux demandes reçues sur `RESPONSE_WINDOW_DAYS` jours. Une
 * demande refusée n'entre pas dans l'échantillon (refuser est une réponse) ;
 * une demande récente sans réponse non plus (trop tôt pour juger).
 */
async function responseDelays(tx: Tx, actorId: string, now: Date) {
	const conversations = await tx.conversation.findMany({
		where: {
			initiatorId: { not: actorId },
			createdAt: { gte: new Date(now.getTime() - RESPONSE_WINDOW_DAYS * DAY_MS) },
			participants: { some: { actorId, state: { not: 'DECLINED' } } }
		},
		select: { createdAt: true, reciprocatedAt: true }
	});
	const unansweredBefore = now.getTime() - UNANSWERED_AFTER_DAYS * DAY_MS;
	return conversations.flatMap((c) => {
		if (c.reciprocatedAt) {
			return [(c.reciprocatedAt.getTime() - c.createdAt.getTime()) / HOUR_MS];
		}
		return c.createdAt.getTime() < unansweredBefore ? [null] : [];
	});
}

/** Faits de réputation d'un acteur, lus dans la transaction. */
export async function reputationFactsFor(
	tx: Tx,
	actorId: string,
	now = new Date()
): Promise<ReputationFacts> {
	const [{ summary }, byKind, delays] = await Promise.all([
		getMusicianTier(actorId, tx),
		endorsementsByKind(tx, actorId),
		responseDelays(tx, actorId, now)
	]);
	return {
		confirmedCollabs: summary.collaborations,
		distinctCounterparts: summary.distinctCollaborators,
		corroboratedGigs: summary.corroboratedGigs,
		verifiedReleases: summary.verifiedReleases,
		bands: summary.bands,
		distinctEndorsers: summary.distinctEndorsers,
		endorsementsByKind: byKind,
		responseBucket: responseBucket(delays)
	};
}

/**
 * Recalcule et enregistre la carte des personnes données (les groupes et les
 * acteurs anonymisés sont ignorés).
 */
export async function recomputeReputation(tx: Tx, actorIds: string[], now = new Date()) {
	const persons = await tx.actor.findMany({
		where: { id: { in: [...new Set(actorIds)] }, kind: 'PERSON', deletedAt: null },
		select: { id: true }
	});
	for (const { id: actorId } of persons) {
		const facts = await reputationFactsFor(tx, actorId, now);
		const data = {
			...facts,
			endorsementsByKind: facts.endorsementsByKind as Prisma.InputJsonValue,
			internalScore: internalScore(facts),
			computedAt: now
		};
		await tx.reputationSnapshot.upsert({
			where: { actorId },
			create: { actorId, ...data },
			update: data
		});
	}
	return persons.length;
}

const RESPONSE_BUCKETS: readonly ResponseBucket[] = ['FAST', 'DAY', 'SLOW'];

/** Colonnes publiques du snapshot : `internalScore` n'est jamais lu ici. */
const PUBLIC_SELECT = {
	confirmedCollabs: true,
	distinctCounterparts: true,
	corroboratedGigs: true,
	verifiedReleases: true,
	bands: true,
	distinctEndorsers: true,
	endorsementsByKind: true,
	responseBucket: true
} as const satisfies Prisma.ReputationSnapshotSelect;

type PublicRow = Prisma.ReputationSnapshotGetPayload<{ select: typeof PUBLIC_SELECT }>;

function toPublic(row: PublicRow): PublicReputation {
	const bucket = RESPONSE_BUCKETS.find((b) => b === row.responseBucket) ?? null;
	const byKind = Array.isArray(row.endorsementsByKind)
		? (row.endorsementsByKind as { label: string; count: number }[])
		: [];
	return publicReputation({ ...row, endorsementsByKind: byKind, responseBucket: bucket });
}

/**
 * Carte publique d'un acteur. Sans carte encore (compte d'avant P2-08, ou
 * jamais touché par un événement), elle est calculée à la demande.
 */
export async function getPublicReputation(
	actorId: string,
	db: PrismaClient
): Promise<PublicReputation> {
	const row = await db.reputationSnapshot.findUnique({
		where: { actorId },
		select: PUBLIC_SELECT
	});
	if (row) return toPublic(row);
	const computed = await db.$transaction((tx) => recomputeReputation(tx, [actorId]));
	if (computed === 0) return EMPTY_REPUTATION;
	const fresh = await db.reputationSnapshot.findUnique({
		where: { actorId },
		select: PUBLIC_SELECT
	});
	return fresh ? toPublic(fresh) : EMPTY_REPUTATION;
}
