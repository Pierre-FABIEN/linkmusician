/**
 * Digest email (P2-09b) : contenu et mise en forme. Module pur : le job lit
 * la base, ce module décide s'il y a quelque chose à dire et l'écrit.
 *
 * Ton (conception 07 §7) : on raconte ce qui est arrivé et ce qui attend,
 * sans pression ni reproche. Rien de neuf : pas d'email (`null`).
 */
import { BRAND } from '../linkmusician/brand';
import { EMAIL_TOPIC_LABELS, notificationText, type NotificationTypeValue } from './types';

/** Au plus un digest par période (un job par jour, marge pour ses décalages). */
export const DIGEST_MIN_INTERVAL_HOURS = 20;
/** Sans digest antérieur, on ne remonte pas plus loin. */
export const DIGEST_LOOKBACK_DAYS = 7;
/** Lignes de notifications détaillées dans l'email ; au-delà, « et N autres ». */
export const DIGEST_MAX_ITEMS = 5;

export type DigestInput = {
	displayName: string;
	notifications: { type: NotificationTypeValue; from: string | null; title: string | null }[];
	/** `null` : sujet coupé par la personne. */
	unreadMessages: number | null;
	progress: { xp: number; achievements: string[] } | null;
};

export type DigestLink = { label: string; url: string };

export type DigestEmail = { subject: string; text: string; html: string };

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Ce que dit l'email, ligne par ligne ; vide s'il n'y a rien de neuf. */
export function digestLines(input: DigestInput): string[] {
	const lines = input.notifications
		.slice(0, DIGEST_MAX_ITEMS)
		.map((n) => notificationText(n.type, n.from, n.title));
	const more = input.notifications.length - DIGEST_MAX_ITEMS;
	if (more > 0) lines.push(`Et ${plural(more, 'autre nouveauté', 'autres nouveautés')}.`);
	if (input.unreadMessages) {
		lines.push(`${plural(input.unreadMessages, 'message t’attend', 'messages t’attendent')}.`);
	}
	if (input.progress && (input.progress.xp > 0 || input.progress.achievements.length > 0)) {
		const parts: string[] = [];
		if (input.progress.xp > 0) parts.push(`+${input.progress.xp} XP`);
		for (const a of input.progress.achievements) parts.push(`succès « ${a} »`);
		lines.push(`Ta progression : ${parts.join(', ')}. Bravo !`);
	}
	return lines;
}

/** Objet : ce qui compte le plus, en peu de mots. */
export function digestSubject(input: DigestInput): string {
	const n = input.notifications.length;
	const m = input.unreadMessages ?? 0;
	if (n > 0 && m > 0) {
		return `Du neuf sur ${BRAND.name} : ${plural(n, 'nouveauté', 'nouveautés')} et ${plural(m, 'message', 'messages')}`;
	}
	if (n > 0) return `Du neuf sur ${BRAND.name} : ${plural(n, 'nouveauté', 'nouveautés')}`;
	if (m > 0) return `${plural(m, 'message t’attend', 'messages t’attendent')} sur ${BRAND.name}`;
	return `Ta progression sur ${BRAND.name}`;
}

const escape = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Email complet, ou `null` s'il n'y a rien à dire. `links.open` mène à
 * l'app, `links.settings` aux préférences, `links.unsubscribe` aux
 * désinscriptions (une par sujet présent dans l'email, plus « tout »).
 */
export function buildDigest(
	input: DigestInput,
	links: { open: string; settings: string; unsubscribe: DigestLink[] }
): DigestEmail | null {
	const lines = digestLines(input);
	if (lines.length === 0) return null;
	const hello = `Bonjour ${input.displayName},`;
	const intro = `Voici ce qui s’est passé pour toi sur ${BRAND.name}.`;
	const footer = 'Tu reçois au plus un email par jour, seulement quand il y a du neuf.';
	const text = [
		hello,
		'',
		intro,
		'',
		...lines.map((l) => `• ${l}`),
		'',
		`Ouvrir ${BRAND.name} : ${links.open}`,
		'',
		footer,
		`Choisir ce que tu reçois : ${links.settings}`,
		...links.unsubscribe.map((u) => `${u.label} : ${u.url}`)
	].join('\n');
	const html = `<!doctype html><html lang="fr"><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1f1f2e;max-width:560px;margin:auto;padding:16px">
<p>${escape(hello)}</p>
<p>${escape(intro)}</p>
<ul>${lines.map((l) => `<li>${escape(l)}</li>`).join('')}</ul>
<p><a href="${escape(links.open)}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:600">Ouvrir ${escape(BRAND.name)}</a></p>
<p style="font-size:12px;color:#6b6b80">${escape(footer)}<br><a href="${escape(links.settings)}">Choisir ce que tu reçois</a>${links.unsubscribe
		.map((u) => ` · <a href="${escape(u.url)}">${escape(u.label)}</a>`)
		.join('')}</p>
</body></html>`;
	return { subject: digestSubject(input), text, html };
}

/** Libellé du lien de désinscription d'un sujet. */
export function unsubscribeLabel(topic: keyof typeof EMAIL_TOPIC_LABELS | 'ALL'): string {
	return topic === 'ALL'
		? 'Ne plus recevoir ces emails'
		: `Ne plus recevoir : ${EMAIL_TOPIC_LABELS[topic].toLowerCase()}`;
}
