/**
 * Rang et objectifs de l'ingé son (P4-02b) : lus dans les événements de
 * domaine (prestations confirmées, crédits de sortie) et dans le profil
 * (spécialités, travaux en écoute, ville). Jamais l'XP.
 */
import type { PrismaClient } from '@prisma/client';
import { craftSummary } from './core/craftSummary';
import { nextSoundObjectives, soundQuestProgress, type SoundQuestState } from './core/craftQuests';
import { craftTier } from './core/tiers';
import { toDomainEvent } from './events';

type Db = Pick<
	PrismaClient,
	'domainEvent' | 'craftReference' | 'soundEngineerProfile' | 'actorLocation'
>;

/** Rang d'ingé son seul (profil public). */
export async function getSoundEngineerTier(actorId: string, db: Db) {
	const facts = await soundFacts(actorId, db);
	return craftTier(facts).tier;
}

async function soundFacts(actorId: string, db: Db) {
	const [rows, listening] = await Promise.all([
		db.domainEvent.findMany({
			where: {
				actorIds: { has: actorId },
				type: { in: ['collaboration.completed', 'release.credit_verified'] }
			},
			select: { id: true, type: true, payload: true, occurredAt: true }
		}),
		db.craftReference.count({ where: { personId: actorId, track: 'SOUND_ENGINEER' } })
	]);
	return craftSummary(actorId, 'SOUND_ENGINEER', rows.map(toDomainEvent), listening);
}

/** Rang, prochains objectifs et avancement de l'ingé son (espace). */
export async function getSoundEngineerProgress(actorId: string, db: Db) {
	const [facts, profile, zone] = await Promise.all([
		soundFacts(actorId, db),
		db.soundEngineerProfile.findUnique({
			where: { personId: actorId },
			select: { specialties: true }
		}),
		db.actorLocation.count({ where: { actorId } })
	]);
	const state: SoundQuestState = {
		...facts,
		specialties: profile?.specialties ?? [],
		hasZone: zone > 0
	};
	return {
		tier: craftTier(facts).tier,
		objectives: nextSoundObjectives(state),
		questProgress: soundQuestProgress(state),
		projects: facts.projects,
		distinctArtists: facts.distinctArtists
	};
}
