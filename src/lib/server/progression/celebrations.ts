/**
 * Célébrations (P2-11) : lit ce qui est neuf depuis le dernier repère de la
 * personne, et enregistre jusqu'où elle a vu. Le client ne renvoie que le
 * repère `upTo` que le serveur lui a donné ; il est borné ici.
 */
import type { PrismaClient } from '@prisma/client';
import { buildCelebrations } from './core/celebrations';

const DERIVED = [
	'progress.level_reached',
	'progress.achievement_unlocked',
	'progress.trust_changed'
] as const;

/** Lignes lues au plus par visite : au-delà, la carte « total » suffit. */
const LIMIT = 50;

type Db = Pick<PrismaClient, 'person' | 'xpTransaction' | 'domainEvent'>;

export async function getPendingCelebrations(actorId: string, db: Db) {
	const person = await db.person.findUniqueOrThrow({
		where: { actorId },
		select: { celebrationsSeenAt: true, createdAt: true }
	});
	const since = person.celebrationsSeenAt ?? person.createdAt;
	const [gains, derived] = await Promise.all([
		db.xpTransaction.findMany({
			where: { actorId, createdAt: { gt: since } },
			orderBy: { createdAt: 'asc' },
			take: LIMIT,
			select: { id: true, amount: true, reason: true, createdAt: true }
		}),
		db.domainEvent.findMany({
			where: { actorIds: { has: actorId }, type: { in: [...DERIVED] }, createdAt: { gt: since } },
			orderBy: { createdAt: 'asc' },
			take: LIMIT,
			select: { id: true, type: true, payload: true, createdAt: true }
		})
	]);
	// Les événements dérivés portent aussi l'acteur dans leur charge : on ne
	// garde que ceux qui le concernent (un succès d'un autre membre, non).
	const mine = derived.filter((e) => {
		const p = e.payload as Record<string, unknown> | null;
		return !p || p.actorId === undefined || p.actorId === actorId;
	});
	const { items, upTo } = buildCelebrations(gains, mine);
	return { items, upTo: upTo?.toISOString() ?? null };
}

/**
 * Avance le repère jusqu'à `upTo` (jamais en arrière, jamais dans le futur).
 * Renvoie `false` si la valeur reçue est invalide.
 */
export async function markCelebrationsSeen(
	actorId: string,
	upTo: unknown,
	db: Pick<PrismaClient, 'person'>,
	now = new Date()
): Promise<boolean> {
	if (typeof upTo !== 'string') return false;
	const date = new Date(upTo);
	if (Number.isNaN(date.getTime()) || date.getTime() > now.getTime()) return false;
	await db.person.updateMany({
		where: {
			actorId,
			OR: [{ celebrationsSeenAt: null }, { celebrationsSeenAt: { lt: date } }]
		},
		data: { celebrationsSeenAt: date }
	});
	return true;
}
