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
import { notBlockedWith } from './where';
import {
	EMAIL_TOPICS,
	EMAIL_TOPIC_LABELS,
	isEmailTopic,
	isNotificationType,
	notificationText,
	NOTIFICATION_TYPES,
	type EmailTopic,
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

/** Nombre de notifications non lues (pastille de la cloche). */
export async function unreadNotifications(actorId: string): Promise<number> {
	return prisma.notification.count({
		where: { recipientActorId: actorId, readAt: null, ...notBlockedWith(actorId) }
	});
}

/** Dernières notifications, texte composé, les non lues signalées. */
export async function listNotifications(actorId: string) {
	const rows = await prisma.notification.findMany({
		where: {
			recipientActorId: actorId,
			type: { in: [...NOTIFICATION_TYPES] },
			...notBlockedWith(actorId)
		},
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
	return rows.flatMap((n) => {
		const type = n.type;
		if (!isNotificationType(type)) return [];
		return [
			{
				id: n.id,
				type,
				href: n.href,
				text: notificationText(type, n.from?.displayName ?? null, n.title),
				unread: n.readAt === null,
				createdAt: n.createdAt
			}
		];
	});
}

/** Tout marquer comme lu jusqu'à `upTo` (ce que la page a montré). */
export async function markNotificationsRead(actorId: string, upTo: Date, now = new Date()) {
	const until = upTo.getTime() > now.getTime() ? now : upTo;
	await prisma.notification.updateMany({
		where: { recipientActorId: actorId, readAt: null, createdAt: { lte: until } },
		data: { readAt: now }
	});
}

/**
 * Préférences de tous les sujets, avec les valeurs par défaut (activé).
 * `inApp` vaut `null` pour les sujets sans ligne sous la cloche (messages,
 * progression) : ils ne se règlent que par email.
 */
export async function getNotificationPreferences(actorId: string) {
	const rows = await prisma.notificationPreference.findMany({
		where: { actorId },
		select: { type: true, inApp: true, email: true }
	});
	const byType = new Map(rows.map((r) => [r.type as string, r]));
	return EMAIL_TOPICS.map((type) => ({
		type,
		label: EMAIL_TOPIC_LABELS[type],
		inApp: isNotificationType(type) ? (byType.get(type)?.inApp ?? true) : null,
		email: byType.get(type)?.email ?? true
	}));
}

/** Sujets d'email voulus par l'acteur (pour le digest). */
export async function emailTopicsOf(actorId: string): Promise<Set<EmailTopic>> {
	const prefs = await getNotificationPreferences(actorId);
	return new Set(prefs.filter((p) => p.email).map((p) => p.type));
}

/** Enregistre les cases cochées dans `/reglages` ; les autres sont coupées. */
export async function setNotificationPreferences(
	actorId: string,
	wanted: { inApp: readonly unknown[]; email: readonly unknown[] }
) {
	const inApp = new Set(wanted.inApp.filter(isNotificationType));
	const email = new Set(wanted.email.filter(isEmailTopic));
	await prisma.$transaction(
		EMAIL_TOPICS.map((type) => {
			const data = {
				inApp: isNotificationType(type) ? inApp.has(type) : true,
				email: email.has(type)
			};
			return prisma.notificationPreference.upsert({
				where: { actorId_type: { actorId, type } },
				create: { actorId, type, ...data },
				update: data
			});
		})
	);
}

/** Désinscription depuis un email : coupe un sujet, ou tous (`ALL`). */
export async function unsubscribeEmail(actorId: string, topic: EmailTopic | 'ALL') {
	const topics = topic === 'ALL' ? EMAIL_TOPICS : [topic];
	await prisma.$transaction(
		topics.map((type) =>
			prisma.notificationPreference.upsert({
				where: { actorId_type: { actorId, type } },
				create: { actorId, type, email: false },
				update: { email: false }
			})
		)
	);
}

/** Purge (P2-09b) : notifications lues depuis plus de 90 jours. */
export const READ_NOTIFICATION_RETENTION_DAYS = 90;

export async function purgeReadNotifications(now = new Date()) {
	const { count } = await prisma.notification.deleteMany({
		where: {
			readAt: { lt: new Date(now.getTime() - READ_NOTIFICATION_RETENTION_DAYS * 86_400_000) }
		}
	});
	return count;
}
