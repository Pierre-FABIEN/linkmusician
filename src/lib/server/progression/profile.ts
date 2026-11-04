/**
 * Progression liée au profil (reporté de P1-06) : chaque modification émet
 * `profile.updated`, et la première fois que le profil devient complet
 * (`isProfileComplete` : instrument, genre, ville, présentation),
 * `profile.completed`, qui rapporte de l'XP.
 *
 * Appelé après l'enregistrement de l'état par la page (profil musical,
 * profil, ville), dans sa propre transaction : l'événement décrit un état
 * déjà écrit.
 */
import type { PrismaClient } from '@prisma/client';
import { isProfileComplete } from '../../skills/profile';
import { emitAndProcess, type ProcessResult } from './processor';

async function appDb(): Promise<PrismaClient> {
	return (await import('#lib/server')).prisma;
}

export async function onProfileChanged(actorId: string, db?: PrismaClient) {
	const client = db ?? (await appDb());
	return client.$transaction(async (tx) => {
		const [instrumentCount, genreCount, zoneCount, actor, completedBefore] = await Promise.all([
			tx.personInstrument.count({ where: { personId: actorId } }),
			tx.actorGenre.count({ where: { actorId } }),
			tx.actorLocation.count({ where: { actorId } }),
			tx.actor.findUniqueOrThrow({ where: { id: actorId }, select: { bio: true } }),
			tx.domainEvent.count({ where: { type: 'profile.completed', actorIds: { has: actorId } } })
		]);
		const results: ProcessResult[] = [
			await emitAndProcess(tx, { type: 'profile.updated', actorId })
		];
		const complete = isProfileComplete({
			instrumentCount,
			genreCount,
			hasZone: zoneCount > 0,
			bio: actor.bio
		});
		if (complete && completedBefore === 0) {
			results.push(await emitAndProcess(tx, { type: 'profile.completed', actorId }));
		}
		return summarize(actorId, results);
	});
}

/** Résumé pour l'interface : XP gagnée et succès débloqués par cet appel. */
export function summarize(actorId: string, results: ProcessResult[]) {
	const xp = results
		.flatMap((r) => r.gains)
		.filter((g) => g.actorId === actorId)
		.reduce((sum, g) => sum + g.amount, 0);
	const achievements = results
		.flatMap((r) => r.achievements)
		.filter((a) => a.actorId === actorId)
		.map((a) => a.achievementId);
	const levelUp = results.flatMap((r) => r.levelUps).find((l) => l.actorId === actorId) ?? null;
	return { xp, achievements, levelUp };
}

export type ProgressSummary = ReturnType<typeof summarize>;
