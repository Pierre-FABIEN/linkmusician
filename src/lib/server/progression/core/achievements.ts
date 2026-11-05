/**
 * Succès (conception 02 §9) : badges ponctuels, déclenchés par les mêmes
 * événements que l'XP, distincts des paliers. Aucun succès n'est lié à un
 * volume de messages ou de connexions. Un succès ne se débloque qu'une fois
 * (unicité en base).
 */
import type { DomainEvent } from './events';
import type { XpGain } from './types';

export type AchievementDefinition = {
	id: string;
	name: string;
	description: string;
	/** Acteurs qui débloquent ce succès avec cet événement et ses gains. */
	unlockedBy(event: DomainEvent, gains: readonly XpGain[]): string[];
};

const byRule =
	(ruleId: string) =>
	(_event: DomainEvent, gains: readonly XpGain[]): string[] =>
		gains.filter((g) => g.ruleId === ruleId && g.amount > 0).map((g) => g.actorId);

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
	{
		id: 'profile-complete',
		name: 'Carte de visite',
		description: 'Profil complété : instrument, genre, ville et présentation.',
		unlockedBy: byRule('profile.completed')
	},
	{
		id: 'first-demo',
		name: 'Premier son',
		description: 'Première démo publiée.',
		unlockedBy: byRule('demo.first')
	},
	{
		id: 'first-contact',
		name: 'Premier contact abouti',
		description: 'Un premier échange réciproque né d’une annonce.',
		unlockedBy: byRule('conversation.reciprocated')
	},
	{
		id: 'first-collaboration',
		name: 'Première collaboration',
		description: 'Une collaboration confirmée des deux côtés.',
		unlockedBy: byRule('collaboration.completed')
	},
	// Succès fun des jams (P2-15b) : aucun ne rapporte d'XP (D27).
	{
		id: 'jam-night-owl',
		name: 'Noctambule',
		description: 'Présent·e à une jam qui a fini après minuit.',
		unlockedBy: (event) => (event.type === 'jam.attended' && event.lateNight ? [event.actorId] : [])
	},
	{
		id: 'jam-all-rounder',
		name: 'Touche-à-tout',
		description: 'Trois instruments différents joués en jam.',
		unlockedBy: (event) =>
			event.type === 'jam.attended' && event.distinctInstruments >= 3 ? [event.actorId] : []
	},
	{
		id: 'jam-icebreaker',
		name: 'Brise-glace',
		description: 'Première appréciation laissée à quelqu’un après une jam.',
		unlockedBy: (event) =>
			event.type === 'endorsement.received' && event.jamId ? [event.endorserId] : []
	},
	{
		id: 'jam-conductor',
		name: 'Chef d’orchestre',
		description: 'Lead d’une jam dont toute la formation invitée a répondu présent.',
		unlockedBy: (event) =>
			event.type === 'jam.attended' && event.ledFullLineup ? [event.actorId] : []
	},
	{
		id: 'founder',
		name: 'Fondateur·rice',
		description: 'Membre d’un groupe au moment de sa formation.',
		unlockedBy: (event) =>
			event.type === 'milestone.attested' && event.milestone === 'FORMATION' ? event.memberIds : []
	}
];

export const ACHIEVEMENTS_BY_ID: ReadonlyMap<string, AchievementDefinition> = new Map(
	ACHIEVEMENTS.map((a) => [a.id, a])
);

/** Succès débloqués par un événement (doublons retirés). */
export function achievementsFor(event: DomainEvent, gains: readonly XpGain[]) {
	const seen = new Set<string>();
	const result: { actorId: string; achievementId: string }[] = [];
	for (const definition of ACHIEVEMENTS) {
		for (const actorId of definition.unlockedBy(event, gains)) {
			const key = `${actorId}|${definition.id}`;
			if (seen.has(key)) continue;
			seen.add(key);
			result.push({ actorId, achievementId: definition.id });
		}
	}
	return result;
}
