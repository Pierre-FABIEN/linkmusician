/**
 * Collaborations (P2-06) : règles pures. Une collaboration rapporte quand
 * **chaque** participant l'a confirmée. Si elle a déjà eu lieu au moment où
 * on la propose, proposer vaut confirmation pour soi : l'autre n'a qu'à
 * confirmer.
 */
import { z } from 'zod';
import { parisDay } from '#lib/metrics/indicators';

/** Types proposés au MVP (concert, production : avec leurs preuves, phases 3 à 5). */
export const COLLAB_KINDS = ['JAM', 'REHEARSAL', 'SESSION_WORK', 'RECORDING'] as const;
export type CollabKindValue = (typeof COLLAB_KINDS)[number] | 'PRODUCTION' | 'GIG';

export const COLLAB_KIND_LABELS: Readonly<Record<CollabKindValue, string>> = {
	JAM: 'Jam',
	REHEARSAL: 'Répétition',
	SESSION_WORK: 'Session ou remplacement',
	RECORDING: 'Enregistrement',
	PRODUCTION: 'Production',
	GIG: 'Concert'
};

export const MAX_COLLAB_TITLE = 80;
/** Fenêtre de dates acceptée autour d'aujourd'hui (jours). */
export const PAST_DAYS = 60;
export const FUTURE_DAYS = 90;

export function collaborationSchema(today: string) {
	const min = shiftDay(today, -PAST_DAYS);
	const max = shiftDay(today, FUTURE_DAYS);
	return z.object({
		kind: z.enum(COLLAB_KINDS),
		title: z.string().trim().min(3, 'Un titre de 3 caractères au moins.').max(MAX_COLLAB_TITLE),
		happenedOn: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Choisis une date.')
			.refine((d) => d >= min, `Au plus ${PAST_DAYS} jours en arrière.`)
			.refine((d) => d <= max, `Au plus ${FUTURE_DAYS} jours à l’avance.`)
	});
}

/** Jour civil décalé (`AAAA-MM-JJ`). */
export function shiftDay(day: string, days: number): string {
	const d = new Date(`${day}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

/** A-t-elle eu lieu (jour civil à Paris) ? */
export function hasHappened(happenedOn: string, now = new Date()): boolean {
	return happenedOn <= parisDay(now);
}

export type Participation = { accepted: boolean; confirmed: boolean };
export type CollabStatusValue = 'PROPOSED' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';

/** État déduit des participations (hors annulation). */
export function collabStatus(participants: readonly Participation[]): CollabStatusValue {
	if (participants.length < 2 || participants.some((p) => !p.accepted)) return 'PROPOSED';
	return participants.every((p) => p.confirmed) ? 'COMPLETED' : 'ACCEPTED';
}

/** Ce que la personne peut faire maintenant. */
export function nextStep(
	status: CollabStatusValue,
	me: Participation,
	happened: boolean
): 'respond' | 'confirm' | 'wait_other' | 'wait_date' | 'done' | 'cancelled' {
	if (status === 'CANCELLED') return 'cancelled';
	if (status === 'COMPLETED') return 'done';
	if (!me.accepted) return 'respond';
	if (!happened) return 'wait_date';
	if (!me.confirmed) return 'confirm';
	return 'wait_other';
}
