/**
 * Projections de la progression. `ActorProgress` n'est qu'une projection du
 * registre : on la recalcule toujours depuis les sommes, jamais par
 * incrément, ce qui la rend reconstructible à l'identique (`rebuildAll`).
 */
import { achievementsFor, ACHIEVEMENTS_BY_ID } from './core/achievements';
import type { DomainEvent } from './core/events';
import { levelFromXp } from './core/levels';
import type { XpGain } from './core/types';
import { recordDerived, type Tx } from './events';

/** Piste qui porte le niveau de compte (somme des pistes). */
export const ACCOUNT_TRACK = 'ACCOUNT';

type TrackTotals = Map<string, number>;

async function totalsByTrack(tx: Tx, actorIds: string[]) {
	const rows = await tx.xpTransaction.groupBy({
		by: ['actorId', 'track'],
		where: { actorId: { in: actorIds } },
		_sum: { amount: true }
	});
	const totals = new Map<string, TrackTotals>();
	for (const id of actorIds) totals.set(id, new Map());
	for (const row of rows) totals.get(row.actorId)?.set(row.track, row._sum.amount ?? 0);
	return totals;
}

function projectionRows(actorId: string, tracks: TrackTotals) {
	const rows = [...tracks].map(([track, xp]) => ({ actorId, track, xp, level: levelFromXp(xp) }));
	const account = [...tracks.values()].reduce((a, b) => a + b, 0);
	rows.push({ actorId, track: ACCOUNT_TRACK, xp: account, level: levelFromXp(account) });
	return rows;
}

/**
 * Recalcule la projection des acteurs donnés ; renvoie les niveaux de compte
 * franchis (pour les événements dérivés).
 */
export async function projectActors(tx: Tx, actorIds: string[]) {
	const ids = [...new Set(actorIds)];
	if (ids.length === 0) return [];
	const before = await tx.actorProgress.findMany({
		where: { actorId: { in: ids }, track: ACCOUNT_TRACK },
		select: { actorId: true, level: true }
	});
	const previousLevel = new Map(before.map((p) => [p.actorId, p.level]));
	const totals = await totalsByTrack(tx, ids);
	const levelUps: { actorId: string; from: number; to: number }[] = [];
	for (const [actorId, tracks] of totals) {
		for (const row of projectionRows(actorId, tracks)) {
			await tx.actorProgress.upsert({
				where: { actorId_track: { actorId, track: row.track } },
				create: row,
				update: { xp: row.xp, level: row.level }
			});
			const from = previousLevel.get(actorId) ?? 1;
			if (row.track === ACCOUNT_TRACK && row.level > from) {
				levelUps.push({ actorId, from, to: row.level });
			}
		}
	}
	return levelUps;
}

/** Débloque les succès d'un événement ; renvoie ceux qui sont nouveaux. */
export async function unlockAchievements(tx: Tx, event: DomainEvent, gains: readonly XpGain[]) {
	const candidates = achievementsFor(event, gains);
	if (candidates.length === 0) return [];
	const existing = await tx.actorAchievement.findMany({
		where: { OR: candidates.map((c) => ({ actorId: c.actorId, achievementId: c.achievementId })) },
		select: { actorId: true, achievementId: true }
	});
	const known = new Set(existing.map((e) => `${e.actorId}|${e.achievementId}`));
	const fresh = candidates.filter((c) => !known.has(`${c.actorId}|${c.achievementId}`));
	await tx.actorAchievement.createMany({
		data: fresh.map((c) => ({ ...c, sourceEventId: event.id })),
		skipDuplicates: true
	});
	return fresh;
}

/** Trace les événements dérivés (niveaux, succès), pour les notifications. */
export async function recordProgressEvents(
	tx: Tx,
	sourceEventId: string,
	levelUps: { actorId: string; from: number; to: number }[],
	achievements: { actorId: string; achievementId: string }[]
) {
	for (const up of levelUps) {
		await recordDerived(tx, 'progress.level_reached', { ...up, sourceEventId }, [up.actorId]);
	}
	for (const a of achievements) {
		const name = ACHIEVEMENTS_BY_ID.get(a.achievementId)?.name ?? a.achievementId;
		await recordDerived(tx, 'progress.achievement_unlocked', { ...a, name, sourceEventId }, [
			a.actorId
		]);
	}
}

/**
 * Reconstruit toutes les projections depuis le registre : efface
 * `actor_progress` (projection, pas donnée source) et la recalcule.
 */
export async function rebuildAll(tx: Tx) {
	const actors = await tx.xpTransaction.findMany({
		distinct: ['actorId'],
		select: { actorId: true }
	});
	await tx.actorProgress.deleteMany({});
	const ids = actors.map((a) => a.actorId);
	const totals = await totalsByTrack(tx, ids);
	const rows = [...totals].flatMap(([actorId, tracks]) => projectionRows(actorId, tracks));
	await tx.actorProgress.createMany({ data: rows });
	return { actors: ids.length, rows: rows.length };
}
