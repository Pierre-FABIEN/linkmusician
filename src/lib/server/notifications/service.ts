/**
 * Notifications dans l'app (P2-09a) : création aux points d'émission
 * (demande de contact, candidatures, collaboration à confirmer,
 * appréciation, invitation de jam), cloche et page `/notifications`,
 * préférences par type dans `/reglages`.
 *
 * Une notification n'est jamais créée pour soi-même, ni entre deux personnes
 * séparées par un blocage (P2-05), ni pour un type que la personne a coupé.
 * Le texte est composé à la lecture (`notificationText`), avec le nom actuel
 * de l'autre personne.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '#lib/server';
import {
	isNotificationType,
	notificationText,
	NOTIFICATION_TYPES,
	NOTIFICATION_TYPE_LABELS,
	type NotificationTypeValue
} from '#lib/notifications/types';

type Db = Prisma.TransactionClient | typeof prisma;

/** Notifications affichées sur la page (les plus récentes). */
export const NOTIFICATION_PAGE_SIZE = 50;

export type NotifyInput = {
	recipientId: string;
	type: NotificationTypeValue;
	fromActorId?: string | null;
	href: string;
	title?: string | null;
};

/**
 * Crée la notification si la personne la veut et si rien ne s'y oppose.
 * À appeler dans la transaction du fait quand il y en a une. Ne lève jamais
 * pour une raison de préférence : renvoie `false`.
 */
export async function notify(db: Db, input: NotifyInput): Promise<boolean> {
	const from = input.fromActorId ?? null;
	if (from === input.recipientId) return false;
	const [preference, blocks] = await Promise.all([
		db.notificationPreference.findUnique({
			where: { actorId_type: { actorId: input.recipientId, type: input.type } },
			select: { inApp: true }
		}),
		from
			? db.block.count({
					where: {
						OR: [
							{ blockerActorId: from, blockedActorId: input.recipientId },
							{ blockerActorId: input.recipientId, blockedActorId: from }
						]
					}
				})
			: Promise.resolve(0)
	]);
	if (preference?.inApp === false || blocks > 0) return false;
	await db.notification.create({
		data: {
			recipientActorId: input.recipientId,
			type: input.type,
			fromActorId: from,
			href: input.href,
			title: input.title ?? null
		}
	});
	return true;
}

/** Filtre « pas de blocage entre l'auteur de la notification et moi ». */
function notBlockedWith(actorId: string): Prisma.NotificationWhereInput {
	return {
		OR: [
			{ fromActorId: null },
			{
				from: {
					blocksMade: { none: { blockedActorId: actorId } },
					blocksReceived: { none: { blockerActorId: actorId } }
				}
			}
		]
	};
}

/** Nombre de notifications non lues (pastille de la cloche). */
export async function unreadNotifications(actorId: string): Promise<number> {
	return prisma.notification.count({
		where: { recipientActorId: actorId, readAt: null, ...notBlockedWith(actorId) }
	});
}

/** Dernières notifications, texte composé, les non lues signalées. */
export async function listNotifications(actorId: string) {
	const rows = await prisma.notification.findMany({
		where: { recipientActorId: actorId, ...notBlockedWith(actorId) },
		orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
		take: NOTIFICATION_PAGE_SIZE,
		select: {
			id: true,
			type: true,
			href: true,
			title: true,
			readAt: true,
			createdAt: true,
			from: { select: { displayName: true } }
		}
	});
	return rows.map((n) => ({
		id: n.id,
		type: n.type,
		href: n.href,
		text: notificationText(n.type, n.from?.displayName ?? null, n.title),
		unread: n.readAt === null,
		createdAt: n.createdAt
	}));
}

/** Tout marquer comme lu jusqu'à `upTo` (ce que la page a montré). */
export async function markNotificationsRead(actorId: string, upTo: Date, now = new Date()) {
	const until = upTo.getTime() > now.getTime() ? now : upTo;
	await prisma.notification.updateMany({
		where: { recipientActorId: actorId, readAt: null, createdAt: { lte: until } },
		data: { readAt: now }
	});
}

/** Préférences de tous les types, avec les valeurs par défaut (activé). */
export async function getNotificationPreferences(actorId: string) {
	const rows = await prisma.notificationPreference.findMany({
		where: { actorId },
		select: { type: true, inApp: true }
	});
	const byType = new Map(rows.map((r) => [r.type, r.inApp]));
	return NOTIFICATION_TYPES.map((type) => ({
		type,
		label: NOTIFICATION_TYPE_LABELS[type],
		inApp: byType.get(type) ?? true
	}));
}

/** Enregistre les types voulus dans l'app ; les autres sont coupés. */
export async function setInAppPreferences(actorId: string, wanted: readonly unknown[]) {
	const on = new Set(wanted.filter(isNotificationType));
	await prisma.$transaction(
		NOTIFICATION_TYPES.map((type) =>
			prisma.notificationPreference.upsert({
				where: { actorId_type: { actorId, type } },
				create: { actorId, type, inApp: on.has(type) },
				update: { inApp: on.has(type) }
			})
		)
	);
}
