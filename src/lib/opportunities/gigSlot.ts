/**
 * Plateaux (P5-05a, conception 08 §8) : un·e organisateur·rice cherche des
 * groupes pour une date, dans un lieu de l'annuaire. Règles pures, partagées
 * par le serveur et le navigateur.
 *
 * Les conditions d'éligibilité portent sur des **faits prouvés** du groupe
 * (son rang, lu dans ses étapes au moins corroborées), son genre et sa zone,
 * **jamais sur l'XP** (02 §1). Un groupe hors conditions ne peut pas
 * candidater : le serveur revérifie à l'envoi (`applyAsBand`).
 */
import { z } from 'zod';
import { MILESTONE_KEYS, type MilestoneKey } from '#lib/milestones/rules';
import { parisToUtc } from '#lib/jam/availability';
import { MAX_DESCRIPTION, MAX_TITLE, OPPORTUNITY_RADII } from './rules';

/** Groupes à l'affiche d'un plateau. */
export const MAX_GIG_BANDS = 10;
/** Un plateau se publie un an à l'avance au plus. */
export const MAX_GIG_DAYS_AHEAD = 365;

/**
 * Rangs de groupe, dans l'ordre du parcours. Copie des libellés de
 * `BAND_TIER_LABELS` (noyau de progression, côté serveur) ; un test vérifie
 * qu'ils restent alignés.
 */
export const GIG_TIER_LABELS: Readonly<Record<MilestoneKey, string>> = {
	FORMATION: 'Projet',
	FIRST_REHEARSAL: 'Répète',
	FIRST_COMPOSITION: 'Compose',
	FIRST_RECORDING: 'Enregistre',
	FIRST_PUBLIC_DEMO: 'Démo',
	FIRST_GIG: 'Live',
	FIRST_TOUR: 'Tournée',
	FIRST_EP: 'EP',
	FIRST_ALBUM: 'Album',
	SIGNING: 'Signé'
};

/** Rangs proposés comme condition : de « Répète » à « Tournée » (au-delà, on ne programme plus sur appel). */
export const GIG_TIER_OPTIONS = (
	['FIRST_REHEARSAL', 'FIRST_RECORDING', 'FIRST_PUBLIC_DEMO', 'FIRST_GIG', 'FIRST_TOUR'] as const
).map((id) => ({ id, label: GIG_TIER_LABELS[id] }));

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure au format HH:MM.');
const optional = <T extends z.ZodTypeAny>(schema: T) =>
	schema.optional().or(z.literal('').transform(() => undefined));

export const gigSlotSchema = z.object({
	venueId: z.string().regex(/^[a-z0-9]{20,40}$/, 'Choisis le lieu du plateau.'),
	day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choisis la date.'),
	start: time,
	title: z.string().trim().min(5, 'Un titre de 5 caractères au moins.').max(MAX_TITLE),
	description: z
		.string()
		.trim()
		.min(20, 'Décris le plateau en 20 caractères au moins.')
		.max(MAX_DESCRIPTION),
	slots: z.coerce.number().int().min(1).max(MAX_GIG_BANDS),
	genre: optional(z.string().regex(/^[a-z0-9-]{1,60}$/)),
	minBandTier: optional(z.enum(MILESTONE_KEYS)),
	radiusKm: z.coerce.number().refine((n) => (OPPORTUNITY_RADII as readonly number[]).includes(n))
});
export type GigSlotForm = z.infer<typeof gigSlotSchema>;

/** Début du plateau (heure de Paris) ; message d'erreur si la date ne va pas. */
export function checkGigDate(
	form: Pick<GigSlotForm, 'day' | 'start'>,
	now = new Date()
): { ok: true; startsAt: Date } | { ok: false; error: string } {
	const startsAt = parisToUtc(
		form.day,
		Number(form.start.slice(0, 2)),
		Number(form.start.slice(3, 5))
	);
	if (Number.isNaN(startsAt.getTime())) return { ok: false, error: 'Date invalide.' };
	if (startsAt.getTime() <= now.getTime()) return { ok: false, error: 'La date est déjà passée.' };
	if (startsAt.getTime() - now.getTime() > MAX_GIG_DAYS_AHEAD * 86_400_000) {
		return { ok: false, error: 'Un plateau se publie un an à l’avance au plus.' };
	}
	return { ok: true, startsAt };
}

/** Conditions d'un plateau. */
export type GigConditions = {
	minBandTier: string | null;
	/** Slug du genre demandé. */
	genre: string | null;
	/** Rayon autour de l'organisateur·rice, en km. */
	radiusKm: number;
};

/** Ce que l'on sait du groupe candidat. */
export type BandFacts = {
	/** Rang du groupe (dernière étape au moins corroborée), `null` sans étape. */
	tier: MilestoneKey | null;
	/** Genres du groupe, parents des sous-genres compris. */
	genreSlugs: readonly string[];
	/** Distance entre le groupe et l'organisateur·rice (km), `null` si le groupe n'a pas de ville. */
	distanceKm: number | null;
};

export type UnmetGigCondition = 'tier' | 'genre' | 'zone';

const rankOf = (key: string | null) => (key ? MILESTONE_KEYS.indexOf(key as MilestoneKey) : -1);

/** Le rang `tier` atteint-il le rang demandé ? Jamais l'XP : l'ordre des étapes. */
export function reachesTier(tier: string | null, min: string | null): boolean {
	return !min || rankOf(tier) >= rankOf(min);
}

/** Conditions non remplies par un groupe (vide = il peut candidater). */
export function unmetGigConditions(o: GigConditions, band: BandFacts): UnmetGigCondition[] {
	const unmet: UnmetGigCondition[] = [];
	if (!reachesTier(band.tier, o.minBandTier)) unmet.push('tier');
	if (o.genre && !band.genreSlugs.includes(o.genre)) unmet.push('genre');
	if (band.distanceKm === null || band.distanceKm > o.radiusKm) unmet.push('zone');
	return unmet;
}

export const UNMET_GIG_LABELS: Readonly<Record<UnmetGigCondition, string>> = {
	tier: 'le rang du groupe n’est pas encore celui demandé',
	genre: 'ce genre n’est pas dans la fiche du groupe',
	zone: 'le groupe est trop loin (ou sa ville n’est pas indiquée)'
};
