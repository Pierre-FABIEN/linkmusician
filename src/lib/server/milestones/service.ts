import { departmentOfCommune } from '#lib/representation/rules';
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
import { checkReleaseReference, type ReleaseReferenceKind } from '#lib/milestones/verification';
import { verifyMusicBrainzRelease, type ReleaseMilestoneKey } from './release-verification';
import { firstTour, TOUR_MIN_GIGS } from '#lib/milestones/tour';
import { isConfirmedBooker } from '#lib/server/representation/service';
import { gigWitnesses } from '#lib/collaborations/rules';
import {
	compositionProof,
	creditDate,
	dayToDate,
	declareBlocker,
	isUpgrade,
	membersAt,
	MILESTONE_CATALOG,
	milestoneDef,
	PERSONAL_MILESTONE_KEYS,
	personalGigProof,
	type PersonalMilestoneKey,
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

/** Sous band: : inclut les anciens membres que peut créditer une étape datée.
 * Ensemble conservateur pour préparer plusieurs événements, sans changer membersAt. */
export async function bandProgressActorIds(tx: Tx, bandId: string): Promise<string[]> {
	const periods = await tx.membership.findMany({
		where: { orgId: bandId, status: { in: ['ACTIVE', 'LEFT', 'REMOVED'] } },
		select: { personId: true }
	});
	return [bandId, ...periods.map((p) => p.personId)];
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

/** Vérifier une sortie par MusicBrainz, puis l'inscrire comme étape vérifiée. */
export async function verifyReleaseMilestone(
	bandId: string,
	managerId: string,
	input: {
		key: ReleaseMilestoneKey;
		kind: ReleaseReferenceKind;
		value: string;
		occurredAt: Date;
	},
	now = new Date()
) {
	const reference = checkReleaseReference(input.kind, input.value);
	if (!reference.ok) throw new MilestoneError(reference.error);

	const bandName = await prisma.$transaction(async (tx) => {
		await lockBand(tx, bandId);
		const band = await managedBand(tx, bandId, managerId);
		if (band.dissolvedAt) throw new MilestoneError('Ce groupe est dissous.');
		if (!band.formedAt) throw new MilestoneError('Les étapes s’ouvrent quand le groupe est formé.');
		const existing = await tx.milestone.count({ where: { bandId, definitionId: input.key } });
		if (existing) throw new MilestoneError('Cette étape est déjà dans votre parcours.');
		const actor = await tx.actor.findUniqueOrThrow({
			where: { id: bandId },
			select: { displayName: true }
		});
		return actor.displayName;
	}, TX);

	const result = await verifyMusicBrainzRelease({
		kind: input.kind,
		value: reference.normalized,
		artistName: bandName,
		key: input.key
	});
	if (result.status === 'not_found') {
		throw new MilestoneError('Cette référence n’a pas été trouvée dans MusicBrainz.');
	}
	if (result.status === 'mismatch') {
		throw new MilestoneError('La sortie ne correspond pas au nom du groupe ou au type demandé.');
	}
	if (result.status === 'unavailable') {
		throw new MilestoneError(
			'La vérification est momentanément indisponible. Réessaie plus tard.',
			503
		);
	}

	await prisma.$transaction(async (tx) => {
		await lockBand(tx, bandId);
		const band = await managedBand(tx, bandId, managerId);
		if (band.dissolvedAt || !band.formedAt) {
			throw new MilestoneError('Ce groupe ne peut plus ajouter cette étape.');
		}
		const existing = await tx.milestone.count({ where: { bandId, definitionId: input.key } });
		if (existing) throw new MilestoneError('Cette étape est déjà dans votre parcours.');
		await tx.milestone.create({
			data: {
				definitionId: input.key,
				bandId,
				proof: 'VERIFIED',
				occurredAt: input.occurredAt,
				declaredById: managerId,
				releaseReferenceKind: input.kind,
				releaseReference: reference.normalized,
				releaseUrl: result.url,
				definitionVersion: await definitionVersion(tx, input.key)
			}
		});
		await attest(tx, {
			bandId,
			key: input.key,
			from: null,
			to: 'VERIFIED',
			occurredAt: input.occurredAt,
			formedAt: band.formedAt,
			now
		});
	}, TX);

	return { title: result.title, url: result.url };
}

/**
 * Corriger la date ou la précision d'une étape déclarée. L'XP déjà versée
 * ne bouge pas.
 */
/**
 * « Premier enregistrement » vérifié par un·e pro (P4-09, 02 §2.2) : une
 * collaboration d'enregistrement terminée, reliée à un morceau du groupe,
 * avec une personne extérieure au groupe qui a assuré la prise de son ou
 * qui gère le studio où elle s'est tenue. L'étape est créée vérifiée, ou
 * renforcée si elle était déclarée ou corroborée ; rien si elle est déjà
 * vérifiée ou gelée par une contestation. Appelé dans la transaction qui
 * termine la collaboration.
 */
export async function verifyRecordingFromCollaboration(
	tx: Tx,
	collab: {
		workId: string;
		happenedOn: Date;
		studioId: string | null;
		/** Participant·es et leur prestation du son (P4-06), s'il y en a une. */
		participants: { actorId: string; service: string | null }[];
	},
	now: Date
) {
	const work = await tx.work.findUnique({
		where: { id: collab.workId },
		select: {
			ownerId: true,
			owner: {
				select: { organization: { select: { kind: true } } }
			}
		}
	});
	// Avant toute lecture d'adhésion ou de formation : ces faits peuvent changer
	// pendant l'attente. L'appelant multi-événements prend déjà ce verrou.
	if (work?.owner.organization?.kind === 'BAND') await lockBand(tx, work.ownerId);
	const band = work
		? await tx.organization.findUnique({
				where: { actorId: work.ownerId },
				select: { kind: true, formedAt: true, dissolvedAt: true }
			})
		: null;
	if (!work || band?.kind !== 'BAND' || !band.formedAt || band.dissolvedAt) return null;
	const bandId = work.ownerId;

	const studioManagers = collab.studioId
		? (
				await tx.membership.findMany({
					where: {
						orgId: collab.studioId,
						status: 'ACTIVE',
						role: { in: ['OWNER', 'ADMIN'] },
						personId: { in: collab.participants.map((p) => p.actorId) }
					},
					select: { personId: true }
				})
			).map((m) => m.personId)
		: [];
	const pros = collab.participants
		.filter((p) => p.service !== null || studioManagers.includes(p.actorId))
		.map((p) => p.actorId);
	if (pros.length === 0) return null;
	// Un·e membre du groupe n'en vérifie pas les étapes.
	const insiders = await tx.membership.count({
		where: { orgId: bandId, status: 'ACTIVE', personId: { in: pros } }
	});
	if (insiders === pros.length) return null;

	const existing = await tx.milestone.findUnique({
		where: { bandId_definitionId: { bandId, definitionId: 'FIRST_RECORDING' } },
		select: { id: true, proof: true, occurredAt: true, frozenAt: true }
	});
	if (existing && (existing.frozenAt || !isUpgrade(existing.proof, 'VERIFIED'))) return null;
	const occurredAt =
		existing?.occurredAt ?? dayToDate(collab.happenedOn.toISOString().slice(0, 10));
	if (existing) {
		await tx.milestone.update({ where: { id: existing.id }, data: { proof: 'VERIFIED' } });
	} else {
		await tx.milestone.create({
			data: {
				definitionId: 'FIRST_RECORDING',
				bandId,
				proof: 'VERIFIED',
				occurredAt,
				workId: collab.workId,
				definitionVersion: await definitionVersion(tx, 'FIRST_RECORDING')
			}
		});
	}
	return attest(tx, {
		bandId,
		key: 'FIRST_RECORDING',
		from: existing?.proof ?? null,
		to: 'VERIFIED',
		occurredAt,
		formedAt: band.formedAt,
		now
	});
}

/**
 * Renforce une étape du groupe à `to` (création, ou montée depuis un niveau
 * plus faible) et émet l'attestation. Rien si elle est déjà à ce niveau ou
 * au-dessus, ou gelée par une contestation (P3-06).
 */
async function raiseMilestone(
	tx: Tx,
	band: { id: string; formedAt: Date },
	key: MilestoneKey,
	to: MilestoneProof,
	day: string,
	now: Date
) {
	await lockBand(tx, band.id);
	const existing = await tx.milestone.findUnique({
		where: { bandId_definitionId: { bandId: band.id, definitionId: key } },
		select: { id: true, proof: true, occurredAt: true, frozenAt: true }
	});
	if (existing && (existing.frozenAt || !isUpgrade(existing.proof, to))) return null;
	const occurredAt = existing?.occurredAt ?? dayToDate(day);
	if (existing) {
		await tx.milestone.update({ where: { id: existing.id }, data: { proof: to } });
	} else {
		await tx.milestone.create({
			data: {
				definitionId: key,
				bandId: band.id,
				proof: to,
				occurredAt,
				definitionVersion: await definitionVersion(tx, key)
			}
		});
	}
	return attest(tx, {
		bandId: band.id,
		key,
		from: existing?.proof ?? null,
		to,
		occurredAt,
		formedAt: band.formedAt,
		now
	});
}

/**
 * Concert terminé (P5-06, conception 02 §4 et 08 §8, §14) : un groupe a
 * joué, accueilli par un lieu ou une organisation que gère l'autre personne.
 * Appelé dans la transaction qui termine la collaboration.
 *
 * - « Premier concert » : **vérifié** si l'hôte est une organisation
 *   vérifiée (SIRET, `isVerifiedOrg`, P5-02), sinon **corroboré** (une
 *   personne extérieure au groupe l'a confirmé). Jamais si la même personne
 *   joue et accueille.
 * - « Première tournée » : vérifiée par ≥3 concerts vérifiés dans ≥3
 *   communes en 30 jours (`firstTour`).
 * - `gig.held` : l'événement tenu crédite qui organise (piste
 *   organisateur·rice, rendement par artiste, confiance de qui confirme) ;
 *   le lieu y gagne son rang, jamais d'XP (Q24).
 */
export async function verifyGigFromCollaboration(
	tx: Tx,
	collab: {
		id: string;
		bandId: string;
		hostOrgId: string;
		happenedOn: Date;
		communeCode: string | null;
		/** « Booké par » (P5-07) : crédité s'il est encore booker confirmé du groupe. */
		bookedById?: string | null;
		participantIds: string[];
	},
	now: Date
) {
	// DASH-04a : sérialiser l’attribution avec la révocation du mandat.
	await lockBand(tx, collab.bandId);
	const [band, host, members, managers] = await Promise.all([
		tx.organization.findUnique({
			where: { actorId: collab.bandId },
			select: { kind: true, formedAt: true, dissolvedAt: true }
		}),
		tx.organization.findUnique({
			where: { actorId: collab.hostOrgId },
			select: { kind: true, verifiedAt: true }
		}),
		tx.membership.findMany({
			where: {
				orgId: collab.bandId,
				status: 'ACTIVE',
				personId: { in: collab.participantIds }
			},
			select: { personId: true }
		}),
		tx.membership.findMany({
			where: {
				orgId: collab.hostOrgId,
				status: 'ACTIVE',
				role: { in: ['OWNER', 'ADMIN'] },
				personId: { in: collab.participantIds }
			},
			select: { personId: true }
		})
	]);
	if (!band || band.kind !== 'BAND' || !host) return null;
	const players = new Set(members.map((m) => m.personId));
	const hosts = managers.map((m) => m.personId).filter((id) => !players.has(id));
	const confirmers = [...players].filter((id) => !managers.some((m) => m.personId === id));
	// Un concert que l'on joue et accueille soi-même ne prouve rien.
	if (hosts.length === 0 || confirmers.length === 0) return null;
	const verified = host.verifiedAt !== null;
	const day = collab.happenedOn.toISOString().slice(0, 10);
	// Booker (P5-07) : seulement si son accompagnement est confirmé et en cours.
	const bookerIds =
		collab.bookedById &&
		!players.has(collab.bookedById) &&
		(await isConfirmedBooker(
			tx,
			collab.bookedById,
			collab.bandId,
			{ on: collab.happenedOn, departmentCode: departmentOfCommune(collab.communeCode) },
			now
		))
			? [collab.bookedById]
			: [];

	// Toute première date du groupe : ni concert terminé avant, ni étape déclarée.
	const [earlierGigs, firstGig] = await Promise.all([
		tx.collaboration.count({
			where: {
				bandId: collab.bandId,
				kind: 'GIG',
				status: 'COMPLETED',
				id: { not: collab.id }
			}
		}),
		tx.milestone.count({ where: { bandId: collab.bandId, definitionId: 'FIRST_GIG' } })
	]);
	await emitAndProcess(tx, {
		type: 'gig.held',
		gigId: collab.id,
		organizerIds: hosts,
		bookerIds,
		performerIds: [collab.bandId],
		confirmerIds: confirmers,
		...(host.kind === 'VENUE' ? { venueOrgId: collab.hostOrgId } : {}),
		firstDateIds: earlierGigs === 0 && firstGig === 0 ? [collab.bandId] : [],
		verified
	});

	for (const bookerId of bookerIds) await creditBookedTour(tx, bookerId, collab.bandId, now);

	if (!band.formedAt || band.dissolvedAt) return null;
	const formed = { id: collab.bandId, formedAt: band.formedAt };
	await raiseMilestone(tx, formed, 'FIRST_GIG', verified ? 'VERIFIED' : 'CORROBORATED', day, now);
	if (!verified) return null;
	// Tournée : les concerts vérifiés du groupe, avec leur commune.
	const gigs = await tx.collaboration.findMany({
		where: {
			bandId: collab.bandId,
			kind: 'GIG',
			status: 'COMPLETED',
			communeCode: { not: null },
			hostOrg: { verifiedAt: { not: null } }
		},
		select: { happenedOn: true, communeCode: true }
	});
	// La collaboration est déjà marquée terminée : elle fait partie de la liste.
	const tour = firstTour(
		gigs.map((g) => ({ day: g.happenedOn.toISOString().slice(0, 10), communeCode: g.communeCode! }))
	);
	if (tour) await raiseMilestone(tx, formed, 'FIRST_TOUR', 'VERIFIED', tour.from, now);
	return null;
}

/**
 * Étape de scène **personnelle** (P8, D77) : création ou montée de preuve,
 * sous la clé du porteur (`band:<personId>`, la même famille de verrou que
 * les étapes de groupe). **Aucune attestation** : pas de `milestone.attested`,
 * donc ni XP de groupe ni part de membre ; la collaboration terminée a déjà
 * rapporté (conception 19 §9.4, aucun barème nouveau). Rien si l'étape est
 * déjà à ce niveau ou au-dessus, ou gelée.
 */
async function raisePersonalMilestone(
	tx: Tx,
	personId: string,
	key: PersonalMilestoneKey,
	hostVerified: boolean,
	day: string
) {
	await lockBand(tx, personId);
	const existing = await tx.milestone.findUnique({
		where: { bandId_definitionId: { bandId: personId, definitionId: key } },
		select: { id: true, proof: true, frozenAt: true }
	});
	if (existing?.frozenAt) return null;
	const to = personalGigProof(existing?.proof ?? null, hostVerified);
	if (!to) return null;
	if (existing) {
		await tx.milestone.update({ where: { id: existing.id }, data: { proof: to } });
		return existing.id;
	}
	const created = await tx.milestone.create({
		data: {
			definitionId: key,
			bandId: personId,
			proof: to,
			occurredAt: dayToDate(day),
			definitionVersion: await definitionVersion(tx, key)
		},
		select: { id: true }
	});
	return created.id;
}

/**
 * Concert **en son nom** terminé (P8, D77, conception 19 §9.4 et DC4) : une
 * personne a joué, accueillie par un lieu ou une organisation que gère
 * l'autre personne. Appelé dans la transaction qui termine la collaboration,
 * à la place de `verifyGigFromCollaboration` (réservée aux groupes).
 *
 * - Relu au moment de la confirmation : la personne interprète est partie de
 *   la collaboration, son compte existe, elle ne gère pas l'hôte ; une
 *   gestion distincte de l'hôte a confirmé. Sinon rien (un concert qu'on
 *   joue et accueille soi-même ne prouve rien).
 * - `gig.held` : comme pour un groupe, l'interprète est la personne ; qui
 *   organise et le booker confirmé de la personne sont crédités, jamais
 *   l'interprète.
 * - « Premier concert » **personnel** : vérifié par une organisation
 *   vérifiée, corroboré sinon. « Première tournée » personnelle : ≥3
 *   concerts vérifiés en son nom dans ≥3 communes en 30 jours. Aucune étape
 *   de groupe n'est touchée, et un concert de groupe n'écrit jamais ici.
 */
export async function verifySoloGigFromCollaboration(
	tx: Tx,
	collab: {
		id: string;
		performerId: string;
		hostOrgId: string;
		happenedOn: Date;
		communeCode: string | null;
		bookedById?: string | null;
		participantIds: string[];
	},
	now: Date
) {
	await lockBand(tx, collab.performerId);
	const [performer, host, managers] = await Promise.all([
		tx.actor.findUnique({
			where: { id: collab.performerId },
			select: { kind: true, deletedAt: true }
		}),
		tx.organization.findUnique({
			where: { actorId: collab.hostOrgId },
			select: { kind: true, verifiedAt: true }
		}),
		tx.membership.findMany({
			where: {
				orgId: collab.hostOrgId,
				status: 'ACTIVE',
				role: { in: ['OWNER', 'ADMIN'] },
				personId: { in: collab.participantIds }
			},
			select: { personId: true }
		})
	]);
	if (!performer || performer.kind !== 'PERSON' || performer.deletedAt || !host) return null;
	const players = collab.participantIds.filter((id) => id === collab.performerId);
	const { hosts, confirmers } = gigWitnesses(
		players,
		managers.map((m) => m.personId)
	);
	if (hosts.length === 0 || confirmers.length === 0) return null;
	const verified = host.verifiedAt !== null;
	const day = collab.happenedOn.toISOString().slice(0, 10);
	const bookerIds =
		collab.bookedById &&
		collab.bookedById !== collab.performerId &&
		(await isConfirmedBooker(
			tx,
			collab.bookedById,
			collab.performerId,
			{ on: collab.happenedOn, departmentCode: departmentOfCommune(collab.communeCode) },
			now
		))
			? [collab.bookedById]
			: [];
	// Toute première date de la personne en son nom : ni concert solo terminé
	// avant, ni « Premier concert » personnel. Ses concerts de groupe ne
	// comptent pas (DC4).
	const [earlierGigs, firstGig] = await Promise.all([
		tx.collaboration.count({
			where: {
				performerId: collab.performerId,
				bandId: null,
				kind: 'GIG',
				status: 'COMPLETED',
				id: { not: collab.id }
			}
		}),
		tx.milestone.count({ where: { bandId: collab.performerId, definitionId: 'FIRST_GIG' } })
	]);
	await emitAndProcess(tx, {
		type: 'gig.held',
		gigId: collab.id,
		organizerIds: hosts,
		bookerIds,
		performerIds: [collab.performerId],
		confirmerIds: confirmers,
		...(host.kind === 'VENUE' ? { venueOrgId: collab.hostOrgId } : {}),
		firstDateIds: earlierGigs === 0 && firstGig === 0 ? [collab.performerId] : [],
		verified
	});
	for (const bookerId of bookerIds) await creditBookedTour(tx, bookerId, collab.performerId, now);

	await raisePersonalMilestone(tx, collab.performerId, 'FIRST_GIG', verified, day);
	if (!verified) return null;
	const gigs = await tx.collaboration.findMany({
		where: {
			performerId: collab.performerId,
			bandId: null,
			kind: 'GIG',
			status: 'COMPLETED',
			communeCode: { not: null },
			hostOrg: { verifiedAt: { not: null } }
		},
		select: { happenedOn: true, communeCode: true }
	});
	const tour = firstTour(
		gigs.map((g) => ({ day: g.happenedOn.toISOString().slice(0, 10), communeCode: g.communeCode! }))
	);
	if (tour) await raisePersonalMilestone(tx, collab.performerId, 'FIRST_TOUR', true, tour.from);
	return null;
}

/**
 * Étapes de scène personnelles d'une personne (P8) : publiques comme les
 * étapes de groupe (un fait confirmé par l'hôte), sans XP ni déclarant.
 */
export async function personalMilestones(personId: string, db: Db = prisma) {
	const rows = await db.milestone.findMany({
		where: {
			bandId: personId,
			definitionId: { in: [...PERSONAL_MILESTONE_KEYS] },
			band: { kind: 'PERSON' }
		},
		select: { id: true, definitionId: true, proof: true, occurredAt: true, frozenAt: true }
	});
	return rows
		.map((r) => ({
			id: r.id,
			key: r.definitionId as PersonalMilestoneKey,
			label: milestoneDef(r.definitionId as MilestoneKey).label,
			proof: r.proof,
			frozen: r.frozenAt !== null,
			occurredAt: r.occurredAt
		}))
		.sort((a, b) => ORDER.get(a.key)! - ORDER.get(b.key)!);
}

/**
 * Tournée bookée (P5-07, 08 §9) : les dates que le booker a bookées pour le
 * groupe et qui l'ont crédité (`gig.held`), après sa dernière tournée
 * bookée avec ce groupe, font-elles une tournée (`firstTour`) ? Si oui,
 * `tour.booked` est émis une fois : 400 × confiance de qui a confirmé.
 */
async function creditBookedTour(tx: Tx, bookerId: string, bandId: string, now: Date) {
	// `bandId` : l'interprète, groupe ou personne en son nom (P8).
	const events = await tx.domainEvent.findMany({
		where: { actorIds: { has: bookerId }, type: { in: ['gig.held', 'tour.booked'] } },
		select: { type: true, payload: true }
	});
	const payloads = events.map((e) => ({ type: e.type, p: e.payload as Record<string, unknown> }));
	const lastTo = payloads
		.filter((e) => e.type === 'tour.booked' && e.p.bookerId === bookerId && e.p.artistId === bandId)
		.map((e) => String(e.p.to))
		.sort()
		.at(-1);
	const booked = new Map<string, string[]>();
	for (const { type, p } of payloads) {
		if (type !== 'gig.held') continue;
		if (!(p.bookerIds as string[]).includes(bookerId)) continue;
		if (!(p.performerIds as string[]).includes(bandId)) continue;
		booked.set(String(p.gigId), p.confirmerIds as string[]);
	}
	if (booked.size < TOUR_MIN_GIGS) return;
	const gigs = await tx.collaboration.findMany({
		where: { id: { in: [...booked.keys()] }, communeCode: { not: null } },
		select: { id: true, happenedOn: true, communeCode: true }
	});
	const dated = gigs
		.map((g) => ({
			id: g.id,
			day: g.happenedOn.toISOString().slice(0, 10),
			communeCode: g.communeCode!
		}))
		.filter((g) => !lastTo || g.day > lastTo);
	const tour = firstTour(dated);
	if (!tour) return;
	const inTour = dated.filter((g) => g.day >= tour.from && g.day <= tour.to);
	await emitAndProcess(tx, {
		type: 'tour.booked',
		bookerId,
		artistId: bandId,
		gigIds: inTour.map((g) => g.id),
		confirmerIds: [...new Set(inTour.flatMap((g) => booked.get(g.id) ?? []))],
		from: tour.from,
		to: tour.to,
		occurredAt: now
	});
}

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
			releaseReferenceKind: true,
			releaseReference: true,
			releaseUrl: true,
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
			note: r.note,
			releaseUrl: r.releaseUrl
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
/** Export RGPD (P8) : étapes de scène franchies en son nom. */
export async function personalMilestonesExport(personId: string) {
	return (await personalMilestones(personId)).map((m) => ({
		etape: m.label,
		preuve: m.proof,
		en_verification: m.frozen,
		date: m.occurredAt
	}));
}

export async function milestonesExport(personId: string) {
	const rows = await prisma.milestone.findMany({
		where: { declaredById: personId },
		orderBy: { createdAt: 'asc' },
		select: {
			definitionId: true,
			proof: true,
			occurredAt: true,
			note: true,
			releaseReferenceKind: true,
			releaseReference: true,
			releaseUrl: true,
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
		reference_type: r.releaseReferenceKind,
		reference: r.releaseReference,
		source_url: r.releaseUrl,
		declaree_le: r.createdAt
	}));
}
