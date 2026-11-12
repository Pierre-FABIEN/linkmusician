/**
 * Rang et objectifs des métiers du son (P4-02b, P4-04) et de
 * l'organisateur·rice (P5-05a) : lus dans les
 * événements de domaine (prestations confirmées, crédits de sortie) et dans
 * le profil (spécialités, travaux en écoute, ville). Jamais l'XP.
 */
import type { PrismaClient, TrackKind } from '@prisma/client';
import type { Objective } from './core/quests';
import { craftSummary } from './core/craftSummary';
import type { CraftTrack } from './core/crafts';
import {
	agentQuestProgress,
	nextAgentObjectives,
	nextProducerObjectives,
	nextPromoterObjectives,
	nextSoundObjectives,
	producerQuestProgress,
	promoterQuestProgress,
	soundQuestProgress
} from './core/craftQuests';
import { agentTier, craftTier, promoterTier } from './core/tiers';
import { agentFacts } from '#lib/server/representation/service';
import { promoterSummary } from './core/promoterSummary';
import { toDomainEvent } from './events';

type Db = Pick<
	PrismaClient,
	'domainEvent' | 'craftReference' | 'soundEngineerProfile' | 'producerProfile' | 'actorLocation'
>;

async function craftFacts(actorId: string, track: CraftTrack, db: Db) {
	const [rows, listening] = await Promise.all([
		db.domainEvent.findMany({
			where: {
				actorIds: { has: actorId },
				type: { in: ['collaboration.completed', 'release.credit_verified'] }
			},
			select: { id: true, type: true, payload: true, occurredAt: true }
		}),
		db.craftReference.count({ where: { personId: actorId, track } })
	]);
	return craftSummary(actorId, track, rows.map(toDomainEvent), listening);
}

/** Rang seul d'un métier du son (profil public). */
export async function getCraftTier(actorId: string, track: CraftTrack, db: Db) {
	return craftTier(await craftFacts(actorId, track, db)).tier;
}

/** Rang d'ingé son seul (profil public). */
export const getSoundEngineerTier = (actorId: string, db: Db) =>
	getCraftTier(actorId, 'SOUND_ENGINEER', db);

/** Rang, prochains objectifs et avancement de l'ingé son (espace). */
export async function getSoundEngineerProgress(actorId: string, db: Db) {
	const [facts, profile, zone] = await Promise.all([
		craftFacts(actorId, 'SOUND_ENGINEER', db),
		db.soundEngineerProfile.findUnique({
			where: { personId: actorId },
			select: { specialties: true }
		}),
		db.actorLocation.count({ where: { actorId } })
	]);
	const state = { ...facts, specialties: profile?.specialties ?? [], hasZone: zone > 0 };
	return {
		tier: craftTier(facts).tier,
		objectives: nextSoundObjectives(state),
		questProgress: soundQuestProgress(state)
	};
}

/** Rang, prochains objectifs et avancement du producteur ou de la productrice. */
export async function getProducerProgress(actorId: string, db: Db) {
	const [facts, profile, zone] = await Promise.all([
		craftFacts(actorId, 'PRODUCER', db),
		db.producerProfile.findUnique({ where: { personId: actorId }, select: { specialties: true } }),
		db.actorLocation.count({ where: { actorId } })
	]);
	const state = { ...facts, specialties: profile?.specialties ?? [], hasZone: zone > 0 };
	return {
		tier: craftTier(facts).tier,
		objectives: nextProducerObjectives(state),
		questProgress: producerQuestProgress(state)
	};
}

/* -------------------------------------------------------------------------- */
/*  Organisateur·rice (P5-05a)                                                */
/* -------------------------------------------------------------------------- */

type PromoterDb = Pick<
	PrismaClient,
	'domainEvent' | 'promoterProfile' | 'actorLocation' | 'opportunity' | 'application'
>;

async function promoterFacts(actorId: string, db: PromoterDb) {
	const rows = await db.domainEvent.findMany({
		where: { actorIds: { has: actorId }, type: 'gig.held' },
		select: { id: true, type: true, payload: true, occurredAt: true }
	});
	return promoterSummary(actorId, rows.map(toDomainEvent));
}

/** Rang d'organisateur·rice seul (profil public) : des événements tenus, jamais l'XP. */
export async function getPromoterTier(actorId: string, db: PromoterDb) {
	return promoterTier(await promoterFacts(actorId, db)).tier;
}

/** Rang, prochains objectifs et avancement de l'organisateur·rice (espace). */
export async function getPromoterProgress(actorId: string, db: PromoterDb) {
	const [facts, profile, zone, gigSlots, bandsProgrammed, publicJams] = await Promise.all([
		promoterFacts(actorId, db),
		db.promoterProfile.findUnique({
			where: { personId: actorId },
			select: { eventKinds: true, _count: { select: { genres: true } } }
		}),
		db.actorLocation.count({ where: { actorId } }),
		db.opportunity.count({ where: { issuerActorId: actorId, kind: 'GIG_SLOT' } }),
		db.application.count({
			where: {
				status: 'ACCEPTED',
				opportunity: { issuerActorId: actorId, kind: 'GIG_SLOT' }
			}
		}),
		db.opportunity.count({
			where: { issuerActorId: actorId, kind: 'JAM', venueId: { not: null } }
		})
	]);
	const state = {
		eventKinds: profile?.eventKinds.length ?? 0,
		genres: profile?._count.genres ?? 0,
		hasZone: zone > 0,
		gigSlots,
		bandsProgrammed,
		publicJams,
		events: facts.events,
		firstDates: facts.firstDates
	};
	return {
		tier: promoterTier(facts).tier,
		objectives: nextPromoterObjectives(state),
		questProgress: promoterQuestProgress(state)
	};
}

/* -------------------------------------------------------------------------- */
/*  Manager et booker (P5-07)                                                 */
/* -------------------------------------------------------------------------- */

type AgentDb = Pick<
	PrismaClient,
	'domainEvent' | 'agentGenre' | 'actorLocation' | 'representation' | 'milestone' | 'organization'
>;

/** Rang, prochains objectifs et avancement du manager ou du booker (espace). */
export async function getAgentProgress(actorId: string, kind: 'MANAGER' | 'BOOKER', db: AgentDb) {
	const [facts, genres, zone, proposals, events] = await Promise.all([
		agentFacts(actorId),
		db.agentGenre.count({ where: { personId: actorId } }),
		db.actorLocation.count({ where: { actorId } }),
		db.representation.count({ where: { agentId: actorId, kind } }),
		kind === 'BOOKER'
			? db.domainEvent.findMany({
					where: { actorIds: { has: actorId }, type: { in: ['gig.held', 'tour.booked'] } },
					select: { type: true, payload: true }
				})
			: Promise.resolve([])
	]);
	const payloadOf = (e: { payload: unknown }) => e.payload as Record<string, unknown>;
	const state = {
		kind,
		genres,
		hasZone: zone > 0,
		proposals,
		artists: facts.artists,
		developedArtists: facts.developedArtists,
		bookedDates: events.filter(
			(e) =>
				e.type === 'gig.held' &&
				((payloadOf(e).bookerIds as string[] | undefined) ?? []).includes(actorId)
		).length,
		bookedTours: events.filter((e) => e.type === 'tour.booked' && payloadOf(e).bookerId === actorId)
			.length
	};
	return {
		tier: agentTier(facts).tier,
		objectives: nextAgentObjectives(state),
		questProgress: agentQuestProgress(state)
	};
}

/**
 * Prochains objectifs de chaque métier qui en a (ONB-02) : premier résultat
 * de l'onboarding, adapté au métier principal. Les autres métiers n'ont pas
 * encore d'objectifs propres.
 */
export const CRAFT_OBJECTIVES: Partial<
	Record<TrackKind, (actorId: string, db: PrismaClient) => Promise<{ objectives: Objective[] }>>
> = {
	SOUND_ENGINEER: getSoundEngineerProgress,
	PRODUCER: getProducerProgress,
	PROMOTER: getPromoterProgress,
	MANAGER: (actorId, db) => getAgentProgress(actorId, 'MANAGER', db),
	BOOKER: (actorId, db) => getAgentProgress(actorId, 'BOOKER', db)
};
