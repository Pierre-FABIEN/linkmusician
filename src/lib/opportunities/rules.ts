/**
 * Annonces (P2-02) : règles pures, partagées par le serveur et le navigateur.
 * Une annonce est une **quête émise** (conception 02 §8) : elle ne rapporte
 * rien à la publication, seulement quand elle est remplie (P2-03, P2-06).
 * Les conditions d'éligibilité portent sur l'instrument, le niveau déclaré,
 * le genre et le palier, **jamais sur l'XP** (02 §1).
 */
import { z } from 'zod';

export const OPPORTUNITY_KINDS = ['JAM', 'RECRUIT_MEMBER', 'SESSION_WORK'] as const;
export type OpportunityKindValue = (typeof OPPORTUNITY_KINDS)[number];

export const OPPORTUNITY_KIND_INFO: Readonly<
	Record<OpportunityKindValue, { label: string; hint: string }>
> = {
	JAM: { label: 'Jam', hint: 'Jouer ensemble pour le plaisir, sans engagement.' },
	RECRUIT_MEMBER: { label: 'Recrutement', hint: 'Un groupe ou un projet cherche un membre.' },
	SESSION_WORK: { label: 'Session ou remplacement', hint: 'Un enregistrement, une date à assurer.' }
};

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
		.or(z.literal('').transform(() => undefined))
});
export type OpportunityForm = z.infer<typeof opportunitySchema>;

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
};

export type EligibilityCondition = {
	instrument?: string | null;
	minLevel?: number | null;
	genre?: string | null;
	minTier?: string | null;
};

/**
 * Conditions non remplies (vide = éligible). Le genre accepte un sous-genre
 * déclaré sous le genre demandé : l'appelant fournit les slugs parents.
 */
export function unmetConditions(
	o: EligibilityCondition,
	facts: CandidateFacts
): ('instrument' | 'level' | 'genre' | 'tier')[] {
	const unmet: ('instrument' | 'level' | 'genre' | 'tier')[] = [];
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
