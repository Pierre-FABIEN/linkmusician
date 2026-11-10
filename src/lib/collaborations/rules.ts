/**
 * Collaborations (P2-06) : règles pures. Une collaboration rapporte quand
 * **chaque** participant l'a confirmée. Si elle a déjà eu lieu au moment où
 * on la propose, proposer vaut confirmation pour soi : l'autre n'a qu'à
 * confirmer.
 */
import { z } from 'zod';
import { parisDay } from '#lib/metrics/indicators';

/**
 * Types proposés au MVP (concert, production : avec leurs preuves, phases 3
 * à 5). Une jam n'est plus une collaboration (D27) : elle ne rapporte que par
 * les appréciations des autres présents (P2-15). `JAM` reste pour l'historique.
 */
export const COLLAB_KINDS = [
	'REHEARSAL',
	'SESSION_WORK',
	'RECORDING',
	// Métiers du son (P4-06).
	'MIXING',
	'MASTERING',
	'LIVE_SOUND',
	'PRODUCTION'
] as const;
export type CollabKindValue = (typeof COLLAB_KINDS)[number] | 'JAM' | 'GIG';

export const COLLAB_KIND_LABELS: Readonly<Record<CollabKindValue, string>> = {
	JAM: 'Jam',
	REHEARSAL: 'Répétition',
	SESSION_WORK: 'Session ou remplacement',
	RECORDING: 'Enregistrement',
	PRODUCTION: 'Production',
	GIG: 'Concert',
	MIXING: 'Mixage',
	MASTERING: 'Mastering',
	LIVE_SOUND: 'Sonorisation d’une date'
};

/**
 * Prestation du son portée par un type de collaboration (P4-06), et métier
 * qu'il faut avoir pour l'assurer. Recopié du noyau (`progression/core/
 * crafts.ts`), qui est réservé au serveur.
 */
export const KIND_SERVICE: Readonly<
	Partial<
		Record<
			CollabKindValue,
			{
				service: 'RECORDING' | 'MIXING' | 'MASTERING' | 'LIVE_SOUND' | 'PRODUCTION';
				track: 'SOUND_ENGINEER' | 'PRODUCER';
				/** Une prestation est obligatoire (on n'enregistre pas toujours avec un·e ingé son). */
				required: boolean;
			}
		>
	>
> = {
	RECORDING: { service: 'RECORDING', track: 'SOUND_ENGINEER', required: false },
	MIXING: { service: 'MIXING', track: 'SOUND_ENGINEER', required: true },
	MASTERING: { service: 'MASTERING', track: 'SOUND_ENGINEER', required: true },
	LIVE_SOUND: { service: 'LIVE_SOUND', track: 'SOUND_ENGINEER', required: true },
	PRODUCTION: { service: 'PRODUCTION', track: 'PRODUCER', required: true }
};

/** Étape du morceau franchie quand la collaboration est terminée (P4-06). */
export const KIND_WORK_STAGE: Readonly<
	Partial<Record<CollabKindValue, 'recordedAt' | 'mixedAt' | 'masteredAt' | 'producedAt'>>
> = {
	RECORDING: 'recordedAt',
	MIXING: 'mixedAt',
	MASTERING: 'masteredAt',
	PRODUCTION: 'producedAt'
};

export const WORK_STAGES = [
	{ field: 'recordedAt', label: 'Enregistré' },
	{ field: 'mixedAt', label: 'Mixé' },
	{ field: 'masteredAt', label: 'Masterisé' },
	{ field: 'producedAt', label: 'Produit' }
] as const;

export type ProviderCheck =
	{ ok: true; provider: 'me' | 'other' | null } | { ok: false; message: string };

/**
 * Qui assure la prestation (P4-06) : moi, l'autre personne, ou personne
 * (on joue). La personne doit avoir le métier ; un mixage, un mastering, une
 * sonorisation ou une production en exigent une.
 */
export function checkProvider(
	kind: CollabKindValue,
	provider: 'me' | 'other' | null,
	tracks: { me: readonly string[]; other: readonly string[] }
): ProviderCheck {
	const spec = KIND_SERVICE[kind];
	if (!spec) return { ok: true, provider: null };
	if (!provider) {
		return spec.required
			? { ok: false, message: 'Dis qui assure la prestation.' }
			: { ok: true, provider: null };
	}
	if (!tracks[provider].includes(spec.track)) {
		const metier = spec.track === 'SOUND_ENGINEER' ? 'ingé son' : 'producteur·rice';
		return {
			ok: false,
			message:
				provider === 'me'
					? `Ajoute le métier ${metier} à ton profil pour assurer cette prestation.`
					: `Cette personne n'a pas le métier ${metier} sur son profil.`
		};
	}
	return { ok: true, provider };
}

export const MAX_COLLAB_TITLE = 80;
/** Fenêtre de dates acceptée autour d'aujourd'hui (jours). */
export const PAST_DAYS = 60;
export const FUTURE_DAYS = 90;

export function collaborationSchema(today: string) {
	const min = shiftDay(today, -PAST_DAYS);
	const max = shiftDay(today, FUTURE_DAYS);
	return z.object({
		kind: z.enum(COLLAB_KINDS),
		/** Qui assure la prestation du son (P4-06) ; vide : on joue. */
		provider: z
			.enum(['me', 'other'])
			.optional()
			.or(z.literal('').transform(() => undefined)),
		/** Morceau concerné (P4-06), relu côté serveur. */
		work: z
			.string()
			.regex(/^[a-z0-9]{10,40}$/)
			.optional()
			.or(z.literal('').transform(() => undefined)),
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
