/**
 * LINKMUSICIAN (P2-09b) : digest email quotidien (`/api/jobs/digest`).
 *
 * - **Au plus un email par jour et par personne** : `persons.digestSentAt`
 *   est réservé par une mise à jour conditionnelle **avant** l'envoi ; deux
 *   passages simultanés du job n'envoient pas deux emails (au pire aucun, si
 *   l'envoi échoue après la réservation).
 * - **Seulement s'il y a du neuf** depuis le dernier digest (7 jours au plus) :
 *   notifications non lues, messages non lus, gains et succès. Ce qui a déjà
 *   été annoncé n'est jamais rappelé (pas de relance quotidienne).
 * - Sujets coupés dans `/reglages` ou par lien de désinscription : ignorés.
 * - Comptes non vérifiés, anonymisés ou suspendus : rien.
 * - Purge des notifications lues depuis plus de 90 jours.
 *
 * Base, envoi et adresse de l'app sont passés par l'appelant : testable sur
 * le schéma `e2e` sans envoyer d'email. Aucun import de SvelteKit.
 */
import type { PrismaClient } from '@prisma/client';
import {
	buildDigest,
	DIGEST_LOOKBACK_DAYS,
	DIGEST_MIN_INTERVAL_HOURS,
	unsubscribeLabel,
	type DigestInput,
	type DigestLink
} from '../../notifications/digest';
import {
	EMAIL_TOPICS,
	isNotificationType,
	NOTIFICATION_TYPES,
	type EmailTopic
} from '../../notifications/types';
import { ACHIEVEMENTS_BY_ID } from '../progression/core/achievements';
import { unsubscribeToken, type UnsubscribeTopic } from '../notifications/unsubscribe';
import { notBlockedWith } from '../notifications/where';

const BATCH = 50;
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const READ_RETENTION_DAYS = 90;

export type DigestMail = {
	to: string;
	subject: string;
	text: string;
	html: string;
	headers: Record<string, string>;
};

export type DigestJobOptions = {
	db: PrismaClient;
	send: (mail: DigestMail) => Promise<unknown>;
	baseUrl: string;
	now?: Date;
	/** Limite aux acteurs donnés (tests). */
	onlyActorIds?: string[];
	log?: (message: string, data?: Record<string, unknown>) => void;
};

/** Ce qu'il y a de neuf pour une personne depuis `since`, selon ses sujets. */
export async function digestInputFor(
	db: PrismaClient,
	person: { actorId: string; displayName: string },
	since: Date,
	topics: ReadonlySet<EmailTopic>
): Promise<DigestInput> {
	const actorId = person.actorId;
	const bellTypes = NOTIFICATION_TYPES.filter((t) => topics.has(t));
	const [notifications, participants, xp, achievements] = await Promise.all([
		bellTypes.length
			? db.notification.findMany({
					where: {
						recipientActorId: actorId,
						readAt: null,
						createdAt: { gt: since },
						type: { in: [...bellTypes] },
						...notBlockedWith(actorId)
					},
					orderBy: { createdAt: 'asc' },
					select: { type: true, title: true, from: { select: { displayName: true } } }
				})
			: Promise.resolve([]),
		topics.has('MESSAGES')
			? db.conversationParticipant.findMany({
					where: { actorId, state: { not: 'DECLINED' } },
					select: { conversationId: true, lastReadAt: true }
				})
			: Promise.resolve(null),
		topics.has('PROGRESS')
			? db.xpTransaction.aggregate({
					where: { actorId, createdAt: { gt: since } },
					_sum: { amount: true }
				})
			: Promise.resolve(null),
		topics.has('PROGRESS')
			? db.actorAchievement.findMany({
					where: { actorId, unlockedAt: { gt: since } },
					orderBy: { unlockedAt: 'asc' },
					select: { achievementId: true }
				})
			: Promise.resolve(null)
	]);
	let unreadMessages: number | null = null;
	if (participants) {
		unreadMessages =
			participants.length === 0
				? 0
				: await db.message.count({
						where: {
							senderActorId: { not: actorId },
							OR: participants.map((p) => ({
								conversationId: p.conversationId,
								createdAt: {
									gt: p.lastReadAt && p.lastReadAt > since ? p.lastReadAt : since
								}
							}))
						}
					});
	}
	return {
		displayName: person.displayName,
		notifications: notifications.flatMap((n) =>
			isNotificationType(n.type)
				? [{ type: n.type, from: n.from?.displayName ?? null, title: n.title }]
				: []
		),
		unreadMessages,
		progress:
			xp && achievements
				? {
						xp: Math.max(0, xp._sum.amount ?? 0),
						achievements: achievements.map(
							(a) => ACHIEVEMENTS_BY_ID.get(a.achievementId)?.name ?? a.achievementId
						)
					}
				: null
	};
}

/** Sujets présents dans l'email : un lien de désinscription chacun, plus « tout ». */
function topicsShown(input: DigestInput): UnsubscribeTopic[] {
	const shown = new Set<UnsubscribeTopic>(input.notifications.map((n) => n.type));
	if (input.unreadMessages) shown.add('MESSAGES');
	if (input.progress && (input.progress.xp > 0 || input.progress.achievements.length > 0)) {
		shown.add('PROGRESS');
	}
	return [...EMAIL_TOPICS.filter((t) => shown.has(t)), 'ALL'];
}

export async function runDigestJob(options: DigestJobOptions) {
	const { db, send, baseUrl } = options;
	const now = options.now ?? new Date();
	const log = options.log ?? (() => {});
	const threshold = new Date(now.getTime() - DIGEST_MIN_INTERVAL_HOURS * HOUR_MS);
	const lookback = new Date(now.getTime() - DIGEST_LOOKBACK_DAYS * DAY_MS);

	const { count: purged } = await db.notification.deleteMany({
		where: {
			readAt: { lt: new Date(now.getTime() - READ_RETENTION_DAYS * DAY_MS) },
			...(options.onlyActorIds ? { recipientActorId: { in: options.onlyActorIds } } : {})
		}
	});

	let cursor: string | undefined;
	let scanned = 0;
	let sent = 0;
	let failed = 0;
	for (;;) {
		const persons = await db.person.findMany({
			where: {
				...(options.onlyActorIds ? { actorId: { in: options.onlyActorIds } } : {}),
				onboardedAt: { not: null },
				OR: [{ digestSentAt: null }, { digestSentAt: { lt: threshold } }],
				user: { emailVerified: true },
				actor: {
					deletedAt: null,
					sanctions: {
						none: {
							kind: 'SUSPENSION',
							liftedAt: null,
							OR: [{ until: null }, { until: { gt: now } }]
						}
					}
				}
			},
			select: {
				actorId: true,
				digestSentAt: true,
				user: { select: { email: true } },
				actor: { select: { displayName: true } }
			},
			orderBy: { actorId: 'asc' },
			take: BATCH,
			...(cursor ? { skip: 1, cursor: { actorId: cursor } } : {})
		});
		if (persons.length === 0) break;
		cursor = persons.at(-1)!.actorId;

		for (const p of persons) {
			scanned += 1;
			const prefs = await db.notificationPreference.findMany({
				where: { actorId: p.actorId, email: false },
				select: { type: true }
			});
			const off = new Set<string>(prefs.map((r) => r.type));
			const topics = new Set(EMAIL_TOPICS.filter((t) => !off.has(t)));
			if (topics.size === 0) continue;
			const since = p.digestSentAt && p.digestSentAt > lookback ? p.digestSentAt : lookback;
			const input = await digestInputFor(
				db,
				{ actorId: p.actorId, displayName: p.actor.displayName },
				since,
				topics
			);
			const unsubscribe: DigestLink[] = topicsShown(input).map((topic) => ({
				label: unsubscribeLabel(topic),
				url: `${baseUrl}/notifications/desinscription?t=${unsubscribeToken(p.actorId, topic)}`
			}));
			const email = buildDigest(input, {
				open: `${baseUrl}/notifications`,
				settings: `${baseUrl}/reglages#notifications`,
				unsubscribe
			});
			if (!email) continue;

			// Réservation avant l'envoi : jamais deux digests le même jour.
			const claimed = await db.person.updateMany({
				where: {
					actorId: p.actorId,
					OR: [{ digestSentAt: null }, { digestSentAt: { lt: threshold } }]
				},
				data: { digestSentAt: now }
			});
			if (claimed.count === 0) continue;
			try {
				await send({
					to: p.user.email,
					...email,
					headers: { 'List-Unsubscribe': `<${unsubscribe.at(-1)!.url}>` }
				});
				sent += 1;
			} catch (err) {
				failed += 1;
				log('Digest non envoyé', { actorId: p.actorId, error: String(err) });
			}
		}
	}
	return { scanned, sent, failed, purged };
}
