/**
 * Annuaire des lieux (P2-14a, D26, D27) : règles pures, partagées par le
 * serveur et le navigateur. Un lieu est toujours public ou professionnel,
 * jamais le domicile d'un particulier ; il n'a pas d'adresse précise, seulement
 * sa commune.
 */
import { z } from 'zod';

export const VENUE_KINDS = [
	'BAR',
	'CAFE_CONCERT',
	'CONCERT_HALL',
	'OPEN_STAGE',
	'MJC',
	'REHEARSAL_SPACE',
	'STUDIO',
	'MUSIC_STORE'
] as const;
export type VenueKindValue = (typeof VENUE_KINDS)[number];

export const VENUE_KIND_LABELS: Readonly<Record<VenueKindValue, string>> = {
	BAR: 'Bar',
	CAFE_CONCERT: 'Café-concert',
	CONCERT_HALL: 'Salle de concert',
	OPEN_STAGE: 'Scène ouverte',
	MJC: 'MJC, centre culturel, école de musique',
	REHEARSAL_SPACE: 'Local de répétition',
	STUDIO: 'Studio',
	MUSIC_STORE: 'Magasin de musique'
};

export const MAX_VENUE_NAME = 80;

/** Nom affiché : texte brut d'une ligne, espaces resserrés. */
export function cleanVenueName(raw: string): string {
	return (
		raw
			// eslint-disable-next-line no-control-regex
			.replace(/[\u0000-\u001f\u007f]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	);
}

/**
 * Clé de doublon : minuscules, sans accents, sans ponctuation, sans article
 * de tête (« Le Bar des Amis » et « bar des amis » sont le même lieu).
 */
export function venueNameKey(raw: string): string {
	return cleanVenueName(raw)
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[’']/g, ' ')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
		.replace(/^(le|la|les|l|au|aux) /, '')
		.replace(/\s+/g, ' ');
}

export const venueSchema = z.object({
	name: z
		.string()
		.transform(cleanVenueName)
		.pipe(
			z
				.string()
				.min(2, 'Le nom du lieu, en 2 caractères au moins.')
				.max(MAX_VENUE_NAME, `Le nom du lieu, en ${MAX_VENUE_NAME} caractères au plus.`)
		)
		.refine((name) => venueNameKey(name).length >= 2, 'Le nom du lieu, en toutes lettres.'),
	kind: z.enum(VENUE_KINDS, { message: 'Choisis le type de lieu.' }),
	communeCode: z.string().regex(/^[0-9AB]{5}$/, 'Choisis la commune du lieu.')
});
export type VenueForm = z.infer<typeof venueSchema>;
