/**
 * Après la jam (P2-15, D27) : règles pures, partagées par le serveur et le
 * navigateur.
 *
 * - « J'y étais » se dit à partir du début de la jam et pendant les 7 jours
 *   qui suivent sa fin. Il ne rapporte rien.
 * - Pendant ces 7 jours, un·e présent·e (TL1) peut laisser à un·e autre
 *   présent·e une appréciation : une qualité ou un instrument, une par
 *   paire et par jam. C'est elle qui rapporte (`endorsement.received`).
 */
import { z } from 'zod';

export const AFTER_JAM_DAYS = 7;
const DAY_MS = 86_400_000;

export const JAM_QUALITIES = ['GROOVE', 'LISTENING', 'IMPRO', 'RELIABLE'] as const;
export type JamQualityValue = (typeof JAM_QUALITIES)[number];

export const JAM_QUALITY_LABELS: Record<JamQualityValue, string> = {
	GROOVE: 'bon groove',
	LISTENING: 'à l’écoute',
	IMPRO: 'belle impro',
	RELIABLE: 'fiable'
};

type Window = { startsAt: Date; endsAt: Date };

/** Fin de la période où l'on dit « J'y étais » et où l'on apprécie. */
export const afterJamDeadline = (jam: Window) =>
	new Date(jam.endsAt.getTime() + AFTER_JAM_DAYS * DAY_MS);

/** La jam a commencé et la période d'après-jam n'est pas finie. */
export function isAfterJamOpen(jam: Window, now = new Date()): boolean {
	return now >= jam.startsAt && now <= afterJamDeadline(jam);
}

/**
 * Peut-on apprécier cette personne ? Renvoie un message d'erreur lisible,
 * ou `null` si oui.
 */
export function endorseRefusal(input: {
	now: Date;
	jam: Window;
	fromId: string;
	toId: string;
	fromPresent: boolean;
	toPresent: boolean;
	fromCanEndorse: boolean;
	alreadyEndorsed: boolean;
}): string | null {
	if (input.fromId === input.toId) return 'Tu ne peux pas t’apprécier toi-même.';
	if (!isAfterJamOpen(input.jam, input.now)) {
		return input.now < input.jam.startsAt
			? 'La jam n’a pas encore commencé.'
			: `Les appréciations se laissent dans les ${AFTER_JAM_DAYS} jours après la jam.`;
	}
	if (!input.fromPresent) return 'Dis d’abord que tu y étais.';
	if (!input.toPresent) return 'Cette personne n’a pas dit qu’elle y était.';
	if (!input.fromCanEndorse) {
		return 'Les appréciations s’ouvrent quand ton compte a un peu d’ancienneté (palier de confiance 1).';
	}
	if (input.alreadyEndorsed) return 'Tu as déjà apprécié cette personne pour cette jam.';
	return null;
}

/** Une qualité ou un instrument, jamais les deux. */
export const endorseSchema = z
	.object({
		to: z.string().regex(/^[a-z0-9][a-z0-9_-]{2,29}$/, 'Personne inconnue.'),
		quality: z.enum(JAM_QUALITIES).optional(),
		instrument: z
			.string()
			.regex(/^[a-z0-9-]{1,60}$/)
			.optional()
	})
	.refine(
		(v) => (v.quality ? 1 : 0) + (v.instrument ? 1 : 0) === 1,
		'Choisis une qualité ou un instrument.'
	);
export type EndorseForm = z.infer<typeof endorseSchema>;

/** Initiales d'un nom affiché, pour la grille des présent·es sans photo. */
export function initials(displayName: string): string {
	const words = displayName
		.trim()
		.split(/\s+/)
		.filter((w) => /\p{L}/u.test(w));
	return (
		words
			.slice(0, 2)
			.map((w) => w.match(/\p{L}/u)![0].toUpperCase())
			.join('') || '?'
	);
}
