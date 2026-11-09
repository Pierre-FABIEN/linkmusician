/**
 * Lecture de la progression d'un acteur pour l'interface (niveau de compte,
 * succès, palier, historique des gains). Jamais de valeur acceptée depuis le
 * client.
 */
import type { PrismaClient } from '@prisma/client';
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID } from './core/achievements';
import type { DomainEventType } from './core/events';
import { levelProgress } from './core/levels';
import { musicianSummary } from './core/summary';
import { musicianTier, type MusicianSummary } from './core/tiers';
import { toDomainEvent } from './events';
import { ACCOUNT_TRACK } from './projector';

export async function getProgress(
	actorId: string,
	db: Pick<PrismaClient, 'actorProgress' | 'actorAchievement'>
) {
	const [account, achievements] = await Promise.all([
		db.actorProgress.findUnique({ where: { actorId_track: { actorId, track: ACCOUNT_TRACK } } }),
		db.actorAchievement.findMany({ where: { actorId }, orderBy: { unlockedAt: 'asc' } })
	]);
	return {
		xp: account?.xp ?? 0,
		...levelProgress(account?.xp ?? 0),
		achievements: achievements.map((a) => ({
			id: a.achievementId,
			name: ACHIEVEMENTS_BY_ID.get(a.achievementId)?.name ?? a.achievementId,
			description: ACHIEVEMENTS_BY_ID.get(a.achievementId)?.description ?? '',
			unlockedAt: a.unlockedAt
		}))
	};
}

/** Tous les succès, débloqués ou non (tableau de bord : les suivants sont visibles). */
export function achievementCatalog(unlocked: readonly { id: string; unlockedAt: Date }[]) {
	const at = new Map(unlocked.map((a) => [a.id, a.unlockedAt]));
	return ACHIEVEMENTS.map((a) => ({
		id: a.id,
		name: a.name,
		description: a.description,
		unlockedAt: at.get(a.id) ?? null
	}));
}

/** Événements qui établissent un palier (`core/summary.ts`). */
export const SUMMARY_EVENTS: readonly DomainEventType[] = [
	'profile.completed',
	'conversation.reciprocated',
	'membership.accepted',
	'collaboration.completed',
	'endorsement.received',
	'endorsement.revoked',
	'milestone.attested',
	'milestone.revoked'
];

/** Résumé musicien lu dans les événements de domaine, et palier qui en découle. */
export async function getMusicianTier(actorId: string, db: Pick<PrismaClient, 'domainEvent'>) {
	const rows = await db.domainEvent.findMany({
		where: { actorIds: { has: actorId }, type: { in: [...SUMMARY_EVENTS] } },
		select: { id: true, type: true, payload: true, occurredAt: true }
	});
	const summary: MusicianSummary = musicianSummary(actorId, rows.map(toDomainEvent));
	return { summary, ...musicianTier(summary) };
}

/**
 * Derniers gains du registre, avec leur raison lisible. Privé : affiché à la
 * personne seulement (D1), jamais sur le profil public.
 */
export async function getXpHistory(
	actorId: string,
	db: Pick<PrismaClient, 'xpTransaction'>,
	limit = 20
) {
	const rows = await db.xpTransaction.findMany({
		where: { actorId },
		orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
		take: limit,
		select: { id: true, amount: true, reason: true, createdAt: true }
	});
	return rows;
}
