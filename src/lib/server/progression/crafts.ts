/**
 * Rang et objectifs des métiers du son (P4-02b, P4-04) : lus dans les
 * événements de domaine (prestations confirmées, crédits de sortie) et dans
 * le profil (spécialités, travaux en écoute, ville). Jamais l'XP.
 */
import type { PrismaClient } from '@prisma/client';
import { craftSummary } from './core/craftSummary';
import type { CraftTrack } from './core/crafts';
import {
	nextProducerObjectives,
	nextSoundObjectives,
	producerQuestProgress,
	soundQuestProgress
} from './core/craftQuests';
import { craftTier } from './core/tiers';
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
