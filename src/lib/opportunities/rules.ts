/**
 * Annonces (P2-02) : règles pures, partagées par le serveur et le navigateur.
 * Une annonce est une **quête émise** (conception 02 §8) : elle ne rapporte
 * rien à la publication, seulement quand elle est remplie (P2-03, P2-06).
 * Les conditions d'éligibilité portent sur l'instrument, le niveau déclaré,
 * le genre et le palier, **jamais sur l'XP** (02 §1).
 */
import { z } from 'zod';
import { SOUND_SPECIALTIES, SOUND_SPECIALTY_INFO } from '#lib/crafts/sound';
import { PRODUCER_SPECIALTIES, PRODUCER_SPECIALTY_INFO } from '#lib/crafts/producer';

export const OPPORTUNITY_KINDS = ['JAM', 'RECRUIT_MEMBER', 'SESSION_WORK', 'GIG_SLOT'] as const;
export type OpportunityKindValue = (typeof OPPORTUNITY_KINDS)[number];

export const OPPORTUNITY_KIND_INFO: Readonly<
	Record<OpportunityKindValue, { label: string; hint: string }>
> = {
	JAM: { label: 'Jam', hint: 'Jouer ensemble pour le plaisir, sans engagement.' },
	RECRUIT_MEMBER: { label: 'Recrutement', hint: 'Un groupe ou un projet cherche un membre.' },
	SESSION_WORK: {
		label: 'Session ou prestation',
		hint: 'Un enregistrement, une date à assurer, un mixage, une production.'
	},
	// P5-05a : publié par un·e organisateur·rice (`/plateaux/nouveau`).
	GIG_SLOT: { label: 'Plateau', hint: 'Une date dans un lieu : on cherche des groupes.' }
};

/** Types publiés par le formulaire général (une jam et un plateau ont leur page). */
export const GENERAL_KINDS = OPPORTUNITY_KINDS.filter((k) => k !== 'JAM' && k !== 'GIG_SLOT');

/**
 * Qui l'annonce cherche (P4-05) : des musicien·nes (par défaut), ou un
 * métier du son, avec une spécialité. Un métier du son se cherche par une
 * annonce de session ou de prestation.
 */
export const OPPORTUNITY_TARGETS = ['MUSICIAN', 'SOUND_ENGINEER', 'PRODUCER'] as const;
export type OpportunityTarget = (typeof OPPORTUNITY_TARGETS)[number];

export const OPPORTUNITY_TARGET_LABELS: Readonly<Record<OpportunityTarget, string>> = {
	MUSICIAN: 'Un·e musicien·ne',
	SOUND_ENGINEER: 'Un·e ingé son',
	PRODUCER: 'Un·e producteur·rice'
};

/** Spécialités qu'un métier visé peut préciser, avec leur libellé. */
export const TARGET_SPECIALTIES: Readonly<
	Record<OpportunityTarget, readonly { id: string; label: string }[]>
> = {
	MUSICIAN: [],
	SOUND_ENGINEER: SOUND_SPECIALTIES.map((id) => ({ id, label: SOUND_SPECIALTY_INFO[id].label })),
	PRODUCER: PRODUCER_SPECIALTIES.map((id) => ({ id, label: PRODUCER_SPECIALTY_INFO[id].label }))
};

export function specialtyLabel(target: OpportunityTarget, specialty: string | null) {
	return TARGET_SPECIALTIES[target].find((s) => s.id === specialty)?.label ?? null;
}

/** Ce que cherche une annonce, en mots (« Un·e ingé son · Prise de son »). */
export function targetLabel(target: OpportunityTarget, specialty: string | null) {
	const precise = specialtyLabel(target, specialty);
	return precise
		? `${OPPORTUNITY_TARGET_LABELS[target]} · ${precise}`
		: OPPORTUNITY_TARGET_LABELS[target];
}

export const OPPORTUNITY_DURATIONS = [7, 14, 30] as const;
export const DEFAULT_DURATION = 14;
export const OPPORTUNITY_RADII = [10, 25, 50, 100] as const;
export const MAX_TITLE = 80;
export const MAX_DESCRIPTION = 1000;
export const MAX_SLOTS = 10;

const optionalSlug = z
	.string()
	.trim()
	.toLowerCase()
	.regex(/^[a-z0-9-]{1,60}$/)
	.optional()
	.or(z.literal('').transform(() => undefined));

/** Formulaire d'annonce (champs facultatifs vides acceptés). */
export const opportunitySchema = z.object({
	kind: z.enum(OPPORTUNITY_KINDS),
	title: z.string().trim().min(5, 'Un titre de 5 caractères au moins.').max(MAX_TITLE),
	description: z
		.string()
		.trim()
		.min(20, 'Décris ton annonce en 20 caractères au moins.')
		.max(MAX_DESCRIPTION),
	instrument: optionalSlug,
	minLevel: z.coerce
		.number()
		.int()
		.min(1)
		.max(5)
		.optional()
		.or(z.literal('').transform(() => undefined)),
	genre: optionalSlug,
	minTier: z
		.string()
		.regex(/^[A-Z_]{3,20}$/)
		.optional()
		.or(z.literal('').transform(() => undefined)),
	radiusKm: z.coerce.number().refine((n) => (OPPORTUNITY_RADII as readonly number[]).includes(n)),
	durationDays: z.coerce
		.number()
		.refine((n) => (OPPORTUNITY_DURATIONS as readonly number[]).includes(n)),
	slots: z.coerce.number().int().min(1).max(MAX_SLOTS),
	startsAt: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional()
		.or(z.literal('').transform(() => undefined)),
	/** Métier visé (P4-05). */
	target: z.enum(OPPORTUNITY_TARGETS).default('MUSICIAN'),
	specialty: z
		.string()
		.regex(/^[A-Z_]{3,20}$/)
		.optional()
		.or(z.literal('').transform(() => undefined)),
	/** Morceau concerné (P4-05), relu côté serveur. */
	work: z
		.string()
		.regex(/^[a-z0-9]{10,40}$/)
		.optional()
		.or(z.literal('').transform(() => undefined))
});
export type OpportunityForm = z.infer<typeof opportunitySchema>;

export type TargetCheck =
	| {
			ok: true;
			target: { track: Exclude<OpportunityTarget, 'MUSICIAN'> | null; specialty: string | null };
	  }
	| { ok: false; message: string };

/**
 * Métier et spécialité visés, relus (P4-05) : un métier du son se cherche
 * par une annonce de session ; la spécialité doit être celle du métier.
 * `track: null` : une annonce de musicien·nes, comme avant.
 */
export function checkTarget(
	form: Pick<OpportunityForm, 'kind' | 'specialty'> & { target?: OpportunityTarget }
): TargetCheck {
	// Sans cible (appel direct du service, annonces d'avant P4-05) : des musicien·nes.
	if (!form.target || form.target === 'MUSICIAN')
		return { ok: true, target: { track: null, specialty: null } };
	if (form.kind !== 'SESSION_WORK')
		return {
			ok: false,
			message: 'Un·e ingé son ou un·e producteur·rice se cherche par une annonce de session.'
		};
	if (form.specialty && !TARGET_SPECIALTIES[form.target].some((s) => s.id === form.specialty))
		return { ok: false, message: 'Cette spécialité ne correspond pas au métier choisi.' };
	return { ok: true, target: { track: form.target, specialty: form.specialty ?? null } };
}

/** Date d'expiration : fin du dernier jour, jamais avant la date de l'événement. */
export function expiresAtFor(durationDays: number, now: Date, startsAt?: Date): Date {
	const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
	return startsAt && startsAt.getTime() < end.getTime()
		? new Date(startsAt.getTime() + 24 * 60 * 60 * 1000)
		: end;
}

export type OpportunityStatusValue = 'OPEN' | 'FILLED' | 'CLOSED' | 'EXPIRED' | 'REMOVED';

/** Visible et ouverte aux candidatures. */
export function isActive(o: { status: OpportunityStatusValue; expiresAt: Date }, now = new Date()) {
	return o.status === 'OPEN' && o.expiresAt.getTime() > now.getTime();
}

/** Statut affiché (une annonce ouverte mais échue est « expirée », même avant la tâche). */
export function displayStatus(
	o: { status: OpportunityStatusValue; expiresAt: Date },
	now = new Date()
): OpportunityStatusValue {
	return o.status === 'OPEN' && o.expiresAt.getTime() <= now.getTime() ? 'EXPIRED' : o.status;
}

export const STATUS_LABELS: Readonly<Record<OpportunityStatusValue, string>> = {
	OPEN: 'Ouverte',
	FILLED: 'Complète',
	CLOSED: 'Clôturée',
	EXPIRED: 'Expirée',
	REMOVED: 'Retirée'
};

/** Ce que sait l'annonce de la personne qui voudrait répondre (P2-03). */
export type CandidateFacts = {
	instruments: { slug: string; level: number }[];
	genreSlugs: string[];
	/** Paliers musicien atteints (identifiants). */
	tiers: string[];
	/** Métiers de la personne (P4-05). */
	tracks?: string[];
	/** Spécialités déclarées dans ses profils de métier (P4-05). */
	specialties?: string[];
};

export type EligibilityCondition = {
	instrument?: string | null;
	minLevel?: number | null;
	genre?: string | null;
	minTier?: string | null;
	/** Métier visé (P4-05) ; vide : musicien·nes. */
	targetTrack?: string | null;
	targetSpecialty?: string | null;
};

export type UnmetCondition = 'instrument' | 'level' | 'genre' | 'tier' | 'track' | 'specialty';

/**
 * Conditions non remplies (vide = éligible). Le genre accepte un sous-genre
 * déclaré sous le genre demandé : l'appelant fournit les slugs parents.
 */
export function unmetConditions(o: EligibilityCondition, facts: CandidateFacts): UnmetCondition[] {
	const unmet: UnmetCondition[] = [];
	if (o.targetTrack) {
		// Un métier du son (P4-05) : le métier, puis la spécialité. Le genre
		// compte aussi (styles produits) ; instrument, niveau et palier
		// musicien ne s'appliquent pas.
		if (!(facts.tracks ?? []).includes(o.targetTrack)) unmet.push('track');
		else if (o.targetSpecialty && !(facts.specialties ?? []).includes(o.targetSpecialty))
			unmet.push('specialty');
		if (o.genre && !facts.genreSlugs.includes(o.genre)) unmet.push('genre');
		return unmet;
	}
	if (o.instrument) {
		const played = facts.instruments.find((i) => i.slug === o.instrument);
		if (!played) unmet.push('instrument');
		else if (o.minLevel && played.level < o.minLevel) unmet.push('level');
	} else if (o.minLevel && !facts.instruments.some((i) => i.level >= o.minLevel!)) {
		unmet.push('level');
	}
	if (o.genre && !facts.genreSlugs.includes(o.genre)) unmet.push('genre');
	if (o.minTier && !facts.tiers.includes(o.minTier)) unmet.push('tier');
	return unmet;
}
