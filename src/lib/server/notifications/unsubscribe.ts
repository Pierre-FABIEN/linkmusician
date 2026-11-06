/**
 * Désinscription du digest par sujet (P2-09b), sans connexion : lien signé
 * (HMAC-SHA256 avec `BETTER_AUTH_SECRET`). Pas d'expiration : un lien d'un
 * vieil email doit toujours marcher. Le jeton ne permet qu'une chose, couper
 * un sujet d'email pour un acteur.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isEmailTopic, type EmailTopic } from '#lib/notifications/types';

export type UnsubscribeTopic = EmailTopic | 'ALL';

function secret(): string {
	const value = process.env.BETTER_AUTH_SECRET;
	if (!value) throw new Error('BETTER_AUTH_SECRET non configuré');
	return value;
}

function signature(actorId: string, topic: UnsubscribeTopic, key = secret()) {
	return createHmac('sha256', key).update(`unsubscribe:${actorId}:${topic}`).digest('base64url');
}

export function unsubscribeToken(actorId: string, topic: UnsubscribeTopic, key?: string): string {
	return `${actorId}.${topic}.${signature(actorId, topic, key)}`;
}

/** Acteur et sujet d'un jeton valide, sinon `null`. */
export function verifyUnsubscribeToken(
	token: string,
	key?: string
): { actorId: string; topic: UnsubscribeTopic } | null {
	const [actorId, topic, sig, ...rest] = token.split('.');
	if (rest.length > 0 || !actorId || !sig) return null;
	if (topic !== 'ALL' && !isEmailTopic(topic)) return null;
	const expected = Buffer.from(signature(actorId, topic, key));
	const given = Buffer.from(sig);
	if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
	return { actorId, topic };
}
