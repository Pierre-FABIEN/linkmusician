/**
 * Messagerie (P2-04) : règles pures, partagées par le serveur et le
 * navigateur.
 *
 * - On écrit à qui on veut (D44) : jusqu'à **3 messages** tant que l'autre
 *   n'a pas répondu. Sa **réponse débloque** la conversation (elle vaut
 *   acceptation : plus de bouton « Accepter » à part).
 * - Refuser ferme la conversation pour l'expéditeur, sans le lui dire.
 * - Les 16-17 ans ne reçoivent pas de nouvelle demande (D5) ; le refus ne
 *   dit jamais pourquoi (l'âge n'est jamais révélé).
 */
import { isIndexable } from '#lib/actors/visibility';

export const MAX_MESSAGE_LENGTH = 2000;

export type MessageCheck = { ok: true; body: string } | { ok: false; reason: 'empty' | 'too_long' };

export const MESSAGE_ERRORS: Record<Exclude<MessageCheck, { ok: true }>['reason'], string> = {
	empty: 'Écris un message.',
	too_long: `Ton message dépasse ${MAX_MESSAGE_LENGTH} caractères.`
};

/** Texte brut : caractères de contrôle retirés, trois sauts de ligne au plus. */
export function checkMessage(raw: string): MessageCheck {
	const body = raw
		.replace(/\r\n?/g, '\n')
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
		.replace(/\n{4,}/g, '\n\n\n')
		.trim();
	if (body.length === 0) return { ok: false, reason: 'empty' };
	if ([...body].length > MAX_MESSAGE_LENGTH) return { ok: false, reason: 'too_long' };
	return { ok: true, body };
}

/** Clé d'une paire, indépendante de l'ordre (une conversation par paire). */
export function pairKey(a: string, b: string): string {
	return [a, b].sort().join(':');
}

export type ParticipantState = 'REQUEST' | 'ACCEPTED' | 'DECLINED';

/** Messages qu'on peut envoyer avant une première réponse (D44). */
export const MAX_MESSAGES_BEFORE_REPLY = 3;

export type SendPermission =
	/** Peut écrire (y compris répondre à un premier message : ça l'accepte). */
	| 'ok'
	/** Trois messages envoyés : attendre la réponse de l'autre. */
	| 'pending'
	/** Refusée, par l'autre ou par moi. */
	| 'declined';

export function sendPermission(input: {
	myState: ParticipantState;
	otherState: ParticipantState;
	/** Messages déjà envoyés par moi dans cette conversation. */
	mySentCount: number;
}): SendPermission {
	if (input.myState === 'DECLINED' || input.otherState === 'DECLINED') return 'declined';
	if (input.otherState === 'REQUEST') {
		return input.mySentCount >= MAX_MESSAGES_BEFORE_REPLY ? 'pending' : 'ok';
	}
	return 'ok';
}

/** Messages qu'il me reste avant sa réponse (`null` : il ou elle a répondu). */
export function messagesLeft(otherState: ParticipantState, mySentCount: number): number | null {
	if (otherState !== 'REQUEST') return null;
	return Math.max(0, MAX_MESSAGES_BEFORE_REPLY - mySentCount);
}

/** Une personne peut-elle recevoir une **nouvelle** demande ? Pas les mineur·es (D5). */
export function canReceiveRequest(birthDate: Date | null | undefined, now = new Date()): boolean {
	return isIndexable(birthDate, now);
}

/** Aperçu d'un message dans la liste des conversations. */
export function preview(body: string, max = 80): string {
	const flat = body.replace(/\s+/g, ' ').trim();
	return [...flat].length > max ? `${[...flat].slice(0, max - 1).join('')}…` : flat;
}
