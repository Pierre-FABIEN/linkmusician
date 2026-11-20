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

/** Une jam où l'on a croisé des musicien·nes, vue depuis « Apprécier ». */
export type CrossedJam = {
	startsAt: Date;
	endsAt: Date;
	/** A dit « J'y étais ». */
	attended: boolean;
	/** Autres présent·es (« J'y étais », pas retiré·es). */
	others: number;
	/** Appréciations déjà laissées dans cette jam. */
	given: number;
};

/** Où en est-on dans cette jam : en cours, à apprécier, à confirmer, ou fait. */
export function crossedStatus(
	jam: CrossedJam,
	now = new Date()
): { live: boolean; left: number; label: string } {
	const live = now >= jam.startsAt && now <= jam.endsAt;
	const left = Math.max(0, jam.others - jam.given);
	// Les présences d'autrui sont privées (D81) : `others` vaut 0 tant que rien
	// n'est partagé, et le libellé ne laisse rien deviner des autres.
	const label = !jam.attended
		? 'Tu y étais ? Dis-le, pour toi seul·e'
		: jam.others === 0
			? 'Tu y étais · présence privée'
			: left === 0
				? 'Tu as apprécié tout le monde'
				: `${left} musicien·ne${left > 1 ? 's' : ''} à apprécier`;
	return { live, left, label };
}

/** Badge du menu : la jam en cours, sinon le nombre de personnes à apprécier. */
export function appreciateBadge(jams: CrossedJam[], now = new Date()): string | null {
	if (jams.some((j) => crossedStatus(j, now).live)) return 'Jam en cours';
	const left = jams
		.filter((j) => j.attended)
		.reduce((sum, j) => sum + crossedStatus(j, now).left, 0);
	return left > 0 ? `${left} à apprécier` : null;
}
