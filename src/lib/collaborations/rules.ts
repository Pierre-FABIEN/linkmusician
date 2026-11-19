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
	'PRODUCTION',
	// Concert (P5-06) : un groupe, un lieu ou une organisation qui l'accueille.
	'GIG'
] as const;
export type CollabKindValue = (typeof COLLAB_KINDS)[number] | 'JAM';

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

/**
 * Rôle du son crédité sur le morceau à la personne qui assure la prestation
 * (P4-07). La sonorisation d'une date ne porte pas sur un morceau.
 */
export const KIND_WORK_ROLE: Readonly<
	Partial<Record<CollabKindValue, 'RECORDING' | 'MIXING' | 'MASTERING' | 'PRODUCTION'>>
> = {
	RECORDING: 'RECORDING',
	MIXING: 'MIXING',
	MASTERING: 'MASTERING',
	PRODUCTION: 'PRODUCTION'
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
		/** Studio où elle a lieu (P4-03c), par son nom d'utilisateur, relu côté serveur. */
		studio: z
			.string()
			.regex(/^[a-z0-9][a-z0-9_-]{1,59}$/)
			.optional()
			.or(z.literal('').transform(() => undefined)),
		/**
		 * Concert (P5-06) : le groupe qui joue et l'hôte, par leurs noms
		 * d'utilisateur. Depuis P8 (D77), `performer` désigne l'interprète :
		 * un groupe **ou** l'une des deux personnes, en son nom ; `band` reste
		 * accepté (formulaires et clients d'avant P8).
		 */
		performer: z
			.string()
			.regex(/^[a-z0-9][a-z0-9_-]{1,59}$/)
			.optional()
			.or(z.literal('').transform(() => undefined)),
		band: z
			.string()
			.regex(/^[a-z0-9][a-z0-9_-]{1,59}$/)
			.optional()
			.or(z.literal('').transform(() => undefined)),
		host: z
			.string()
			.regex(/^[a-z0-9][a-z0-9_-]{1,59}$/)
			.optional()
			.or(z.literal('').transform(() => undefined)),
		/** Booker confirmé du groupe qui a booké la date (P5-07), relu côté serveur. */
		booker: z
			.string()
			.regex(/^[a-z0-9][a-z0-9_-]{1,59}$/)
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

/**
 * Un concert (P5-06) dit qui a joué et quel lieu ou quelle organisation l'a
 * accueilli ; les autres types n'ont ni l'un ni l'autre. Qui a joué (P8,
 * D77) : un groupe ou une personne en son nom (`performer`, ou `band` pour
 * les formulaires d'avant P8 ; les deux ensemble doivent concorder).
 */
export function checkGigParties(
	kind: CollabKindValue,
	parties: { band?: string; performer?: string; host?: string; booker?: string }
): string | null {
	if (kind !== 'GIG') {
		return parties.band || parties.performer || parties.host || parties.booker
			? 'Seul un concert dit son groupe et son lieu.'
			: null;
	}
	if (parties.band && parties.performer && parties.band !== parties.performer) {
		return 'Choisis une seule interprète : le groupe ou la personne qui a joué.';
	}
	if (!gigPerformerHandle(parties)) return 'Choisis qui a joué : un groupe, ou toi en ton nom.';
	if (!parties.host) return 'Choisis le lieu ou l’organisation qui accueille le concert.';
	return null;
}

/** Nom d'utilisateur de l'interprète saisi (P8) : `performer`, sinon `band`. */
export function gigPerformerHandle(parties: { band?: string; performer?: string }) {
	return parties.performer ?? parties.band ?? null;
}

/**
 * Interprète d'un concert (P8, D77, conception 19 §9.4) : le groupe **ou** la
 * personne, jamais les deux (DC4). `players` : les personnes de la
 * conversation qui jouent (membres actifs du groupe, ou la personne elle-même).
 */
export type GigPerformer =
	{ kind: 'BAND'; id: string; players: readonly string[] } | { kind: 'PERSON'; id: string };

/** Personnes de la paire qui jouent pour cet interprète. */
export function gigPlayers(performer: GigPerformer, pair: readonly string[]): string[] {
	return performer.kind === 'PERSON'
		? pair.filter((id) => id === performer.id)
		: pair.filter((id) => performer.players.includes(id));
}

/**
 * Un concert se confirme à deux (P5-06, D75) : l'une joue, l'autre gère
 * l'hôte, et ce ne sont pas les mêmes personnes. Une personne en son nom
 * (P8) ne peut pas gérer elle-même l'hôte : jouer et s'accueillir ne prouve
 * rien.
 */
export function gigSplitOk(
	performer: GigPerformer,
	pair: readonly string[],
	hostManagers: readonly string[]
): boolean {
	const players = gigPlayers(performer, pair);
	if (performer.kind === 'PERSON') {
		return (
			players.length === 1 &&
			!hostManagers.includes(performer.id) &&
			hostManagers.some((m) => m !== performer.id && pair.includes(m))
		);
	}
	return players.some((player) => hostManagers.some((manager) => manager !== player));
}

/**
 * Côtés d'un concert terminé (P5-06, relu au moment de la confirmation) :
 * qui l'accueille sans jouer, qui joue sans accueillir. Sans l'un ou
 * l'autre, le concert ne prouve rien (`verifyGigFromCollaboration`).
 */
export function gigWitnesses(players: readonly string[], managers: readonly string[]) {
	const playing = new Set(players);
	return {
		hosts: [...new Set(managers)].filter((id) => !playing.has(id)),
		confirmers: [...playing].filter((id) => !managers.includes(id))
	};
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
