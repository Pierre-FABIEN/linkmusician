/**
 * Étapes de groupe (P3-04, D41), seul point d'écriture de `Milestone`. Les
 * écritures prennent le verrou du groupe (le même que
 * `#lib/server/bands/service`, réentrant dans une transaction) : une étape
 * n'existe qu'une fois par groupe, et son XP n'est versée qu'une fois par
 * niveau de preuve.
 *
 * Trois façons d'arriver :
 * - « Formation » : à la 2ᵉ adhésion active (`recordFormation`, appelé par
 *   le service des groupes), vérifiée ;
 * - « Première composition » : suit les morceaux composés du groupe
 *   (`syncComposition`, appelé par le service des morceaux et à la
 *   formation) ; déclarée, puis corroborée quand un morceau l'est ;
 * - les autres étapes ouvertes se **déclarent** par la gestion du groupe
 *   (`declareMilestone`). Leurs preuves (confirmations, liens) passent par
 *   `./proofs.ts` (P3-05).
 *
 * Progression : chaque création ou renforcement de preuve émet
 * `milestone.attested` (XP différentielle au groupe, 25 % aux membres
 * présents à la date de l'étape, `membersAt`). Corriger la date ou la
 * précision d'une étape ne change pas l'XP déjà versée (registre en ajout
 * seul) ; une étape fausse se conteste (P3-06, `./disputes.ts`).
 *
 * Imports : ni le service des groupes ni celui des morceaux (ils appellent
 * celui-ci).
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import { emitAndProcess, type ProcessResult } from '#lib/server/progression/processor';
import { isManager } from '#lib/bands/rules';
import { bandTier } from '#lib/server/progression/core/tiers';
import {
	compositionProof,
	creditDate,
	dayToDate,
	declareBlocker,
	isUpgrade,
	membersAt,
	MILESTONE_CATALOG,
	milestoneDef,
	type DeclareInput,
	type MilestoneDetails,
	type MilestoneKey,
	type MilestoneProof
} from '#lib/milestones/rules';

export class MilestoneError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

type Tx = Prisma.TransactionClient;
type Db = Tx | typeof prisma;
/** Le traitement d'un événement de progression peut dépasser 5 s (P2-08). */
const TX = { timeout: 20_000 } as const;

/** Verrou du groupe (le même que les adhésions), réentrant dans une transaction. */
export async function lockBand(tx: Tx, bandId: string) {
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`band:${bandId}`}))`;
}

async function definitionVersion(tx: Tx, key: MilestoneKey) {
	const def = await tx.milestoneDefinition.findUnique({
		where: { id: key },
		select: { version: true }
	});
	// Référentiel absent : `npm run seed:referentiels` n'a pas été joué.
	if (!def) throw new Error(`Étape ${key} absente du référentiel (seed:referentiels).`);
	return def.version;
}

/**
 * Émet l'attestation. Les membres crédités sont ceux présents à la date de
 * l'étape (ou de la formation, pour une étape d'avant la plateforme).
 */
export async function attest(
	tx: Tx,
	input: {
		bandId: string;
		key: MilestoneKey;
		from: MilestoneProof | null;
		to: MilestoneProof;
		occurredAt: Date;
		formedAt: Date;
		now: Date;
	}
) {
	const periods = await tx.membership.findMany({
		where: { orgId: input.bandId, status: { in: ['ACTIVE', 'LEFT', 'REMOVED'] } },
		select: { personId: true, startedAt: true, endedAt: true }
	});
	return emitAndProcess(tx, {
		type: 'milestone.attested',
		bandId: input.bandId,
		milestone: input.key,
		from: input.from,
		to: input.to,
		memberIds: membersAt(periods, creditDate(input.occurredAt, input.formedAt)),
		occurredAt: input.now
	});
}

/**
 * Le groupe vient d'être formé (2ᵉ adhésion active) : étape vérifiée,
 * créditée aux membres actifs. Sans effet si elle existe déjà.
 */
export async function recordFormation(tx: Tx, bandId: string, memberIds: string[], now: Date) {
	const { count } = await tx.milestone.createMany({
		data: {
			definitionId: 'FORMATION',
			bandId,
			proof: 'VERIFIED',
			occurredAt: now,
			definitionVersion: await definitionVersion(tx, 'FORMATION')
		},
		skipDuplicates: true
	});
	if (count === 0) return null;
	return emitAndProcess(tx, {
		type: 'milestone.attested',
		bandId,
		milestone: 'FORMATION',
		from: null,
		to: 'VERIFIED',
		memberIds,
		occurredAt: now
	});
}

/**
 * « Première composition » suit les morceaux composés du groupe : créée au
 * premier (déclarée, ou corroborée s'il l'est déjà), renforcée quand un
 * morceau du groupe est corroboré. Rien tant que le groupe n'est pas formé :
 * il la recevra à sa formation. Appelé dans la transaction de l'écriture du
 * morceau ou de l'adhésion.
 */
export async function syncComposition(
	tx: Tx,
	bandId: string,
	now: Date
): Promise<ProcessResult | null> {
	await lockBand(tx, bandId);
	const band = await tx.organization.findUnique({
		where: { actorId: bandId },
		select: { formedAt: true, dissolvedAt: true }
	});
	if (!band?.formedAt || band.dissolvedAt) return null;
	const works = await tx.work.findMany({
		where: { ownerId: bandId, state: 'COMPOSED' },
		orderBy: { composedAt: 'asc' },
		select: { id: true, proof: true, composedAt: true }
	});
	const target = compositionProof(works);
	if (!target) return null;
	const carrier = works.find((w) => w.proof === target) ?? works[0];
	const existing = await tx.milestone.findUnique({
		where: { bandId_definitionId: { bandId, definitionId: 'FIRST_COMPOSITION' } },
		select: { id: true, proof: true, occurredAt: true }
	});
	if (existing && !isUpgrade(existing.proof, target)) return null;
	let occurredAt: Date;
	if (existing) {
		occurredAt = existing.occurredAt;
		await tx.milestone.update({
			where: { id: existing.id },
			data: { proof: target, workId: carrier.id }
		});
	} else {
		occurredAt = works[0].composedAt ?? now;
		await tx.milestone.create({
			data: {
				definitionId: 'FIRST_COMPOSITION',
				bandId,
				proof: target,
				occurredAt,
				workId: carrier.id,
				definitionVersion: await definitionVersion(tx, 'FIRST_COMPOSITION')
			}
		});
	}
	return attest(tx, {
		bandId,
		key: 'FIRST_COMPOSITION',
		from: existing?.proof ?? null,
		to: target,
		occurredAt,
		formedAt: band.formedAt,
		now
	});
}

/** Le groupe, vivant, et la gestion de la personne (sinon refus). */
export async function managedBand(tx: Tx, bandId: string, personId: string) {
	const band = await tx.organization.findFirst({
		where: { actorId: bandId, kind: 'BAND', actor: { deletedAt: null } },
		select: { formedAt: true, dissolvedAt: true }
	});
	if (!band) throw new MilestoneError('Ce groupe n’existe plus.', 404);
	const mine = await tx.membership.findFirst({
		where: { orgId: bandId, personId, status: 'ACTIVE' },
		select: { role: true }
	});
	if (!isManager(mine?.role)) {
		throw new MilestoneError('Seules les personnes qui gèrent le groupe peuvent faire cela.', 403);
	}
	return band;
}

/**
 * Déclarer une étape franchie (gestion du groupe, groupe formé, une fois
 * par étape). Rapporte l'XP « déclarée » du barème.
 */
export async function declareMilestone(
	bandId: string,
	managerId: string,
	input: DeclareInput,
	now = new Date()
) {
	return prisma.$transaction(async (tx) => {
		await lockBand(tx, bandId);
		const band = await managedBand(tx, bandId, managerId);
		const already = await tx.milestone.count({ where: { bandId, definitionId: input.key } });
		const blocker = declareBlocker({
			key: input.key,
			formed: band.formedAt !== null,
			dissolved: band.dissolvedAt !== null,
			already: already > 0
		});
		if (blocker) throw new MilestoneError(blocker);
		const occurredAt = dayToDate(input.day);
		const milestone = await tx.milestone.create({
			data: {
				definitionId: input.key,
				bandId,
				proof: 'DECLARED',
				occurredAt,
				note: input.note,
				declaredById: managerId,
				definitionVersion: await definitionVersion(tx, input.key)
			},
			select: { id: true }
		});
		await attest(tx, {
			bandId,
			key: input.key,
			from: null,
			to: 'DECLARED',
			occurredAt,
			formedAt: band.formedAt!,
			now
		});
		return milestone;
	}, TX);
}

/**
 * Corriger la date ou la précision d'une étape déclarée. L'XP déjà versée
 * ne bouge pas.
 */
export async function updateMilestoneDetails(
	milestoneId: string,
	managerId: string,
	details: MilestoneDetails
) {
	await prisma.$transaction(async (tx) => {
		const row = await tx.milestone.findUnique({
			where: { id: milestoneId },
			select: { bandId: true, definitionId: true, frozenAt: true }
		});
		if (!row) throw new MilestoneError('Cette étape n’existe plus.', 404);
		await lockBand(tx, row.bandId);
		const band = await managedBand(tx, row.bandId, managerId);
		if (band.dissolvedAt) throw new MilestoneError('Ce groupe est dissous.');
		if (row.frozenAt) {
			throw new MilestoneError('Cette étape est en vérification : la modération va trancher.');
		}
		if (milestoneDef(row.definitionId as MilestoneKey).mode !== 'declare') {
			throw new MilestoneError('Cette étape se met à jour toute seule.');
		}
		await tx.milestone.update({
			where: { id: milestoneId },
			data: { occurredAt: dayToDate(details.day), note: details.note }
		});
	}, TX);
}

// ─── Lectures ────────────────────────────────────────────────────────────

const ORDER = new Map(MILESTONE_CATALOG.map((d) => [d.key, d.ordinal]));

/**
 * Étapes franchies par le groupe, dans l'ordre du parcours. Publiques (D1) :
 * ni XP ni personne qui a déclaré.
 */
export async function bandMilestones(bandId: string, db: Db = prisma) {
	const rows = await db.milestone.findMany({
		where: { bandId, definition: { active: true } },
		select: {
			id: true,
			definitionId: true,
			proof: true,
			occurredAt: true,
			note: true,
			frozenAt: true
		}
	});
	return rows
		.map((r) => ({
			id: r.id,
			key: r.definitionId as MilestoneKey,
			label: milestoneDef(r.definitionId as MilestoneKey).label,
			proof: r.proof,
			/** Contestée (P3-06) : affichée « En vérification », sans niveau de preuve. */
			frozen: r.frozenAt !== null,
			occurredAt: r.occurredAt,
			note: r.note
		}))
		.sort((a, b) => ORDER.get(a.key)! - ORDER.get(b.key)!);
}
export type BandMilestone = Awaited<ReturnType<typeof bandMilestones>>[number];

/**
 * Rang du groupe (P3-08) : la dernière étape du parcours au moins corroborée
 * (la formation compte toujours), jamais une étape gelée par une
 * contestation (D49). Public : un fait prouvé, ni XP ni confiance.
 */
export async function bandTierOf(bandId: string, db: Db = prisma) {
	const steps = await bandMilestones(bandId, db);
	const tier = bandTier(
		Object.fromEntries(steps.filter((s) => !s.frozen).map((s) => [s.key, s.proof]))
	);
	return tier ? { id: tier.milestone, label: tier.label } : null;
}

/** Export RGPD : étapes que la personne a déclarées pour un groupe. */
export async function milestonesExport(personId: string) {
	const rows = await prisma.milestone.findMany({
		where: { declaredById: personId },
		orderBy: { createdAt: 'asc' },
		select: {
			definitionId: true,
			proof: true,
			occurredAt: true,
			note: true,
			createdAt: true,
			band: { select: { displayName: true } }
		}
	});
	return rows.map((r) => ({
		groupe: r.band.displayName,
		etape: milestoneDef(r.definitionId as MilestoneKey).label,
		preuve: r.proof,
		date: r.occurredAt,
		precision: r.note,
		declaree_le: r.createdAt
	}));
}
