/**
 * Appréciations après une collaboration (P2-07, D27) : règles pures,
 * partagées par le serveur et le navigateur.
 *
 * Même mécanique que les jams (P2-15) : une appréciation par paire et par
 * collaboration confirmée par tous, une qualité ou un instrument déclaré
 * par la personne, confiance TL1 requise. Les points décroissent par paire
 * sur 12 mois (règle `endorsement.received`). Elle peut être reprise, puis
 * redonnée.
 */
import { z } from 'zod';

export const COLLAB_QUALITIES = ['RELIABLE', 'ON_TIME', 'PREPARED', 'GOOD_VIBE'] as const;
export type CollabQualityValue = (typeof COLLAB_QUALITIES)[number];

export const COLLAB_QUALITY_LABELS: Record<CollabQualityValue, string> = {
	RELIABLE: 'fiable',
	ON_TIME: 'à l’heure',
	PREPARED: 'bien préparé·e',
	GOOD_VIBE: 'bonne ambiance'
};

/**
 * Peut-on apprécier cette personne pour cette collaboration ? Renvoie un
 * message lisible, ou `null` si oui.
 */
export function collabEndorseRefusal(input: {
	fromId: string;
	toId: string;
	completed: boolean;
	fromIsParticipant: boolean;
	toIsParticipant: boolean;
	fromCanEndorse: boolean;
	blocked: boolean;
	alreadyEndorsed: boolean;
}): string | null {
	if (input.fromId === input.toId) return 'Tu ne peux pas t’apprécier toi-même.';
	if (!input.fromIsParticipant || !input.toIsParticipant || input.blocked) {
		return 'Tu ne peux apprécier que quelqu’un avec qui tu as collaboré.';
	}
	if (!input.completed) return 'Les appréciations s’ouvrent une fois la collaboration confirmée.';
	if (!input.fromCanEndorse) {
		return 'Les appréciations s’ouvrent quand ton compte a un peu d’ancienneté (palier de confiance 1).';
	}
	if (input.alreadyEndorsed) return 'Tu as déjà apprécié cette personne pour cette collaboration.';
	return null;
}

/** Une qualité ou un instrument, jamais les deux. */
export const collabEndorseSchema = z
	.object({
		collaborationId: z.string().regex(/^[a-z0-9]{10,40}$/, 'Collaboration introuvable.'),
		to: z.string().regex(/^[a-z0-9][a-z0-9_-]{2,29}$/, 'Personne inconnue.'),
		quality: z.enum(COLLAB_QUALITIES).optional(),
		instrument: z
			.string()
			.regex(/^[a-z0-9-]{1,60}$/)
			.optional()
	})
	.refine(
		(v) => (v.quality ? 1 : 0) + (v.instrument ? 1 : 0) === 1,
		'Choisis une qualité ou un instrument.'
	);
export type CollabEndorseForm = z.infer<typeof collabEndorseSchema>;
