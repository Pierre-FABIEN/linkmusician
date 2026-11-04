/**
 * Familles d'instruments : ordre d'affichage et libellés.
 *
 * Module pur, partagé par le serveur et le navigateur. Aligné sur l'enum
 * Prisma `InstrumentFamily` (vérifié à la compilation dans
 * `src/lib/prisma/skills/referentials.ts`). Les instruments eux-mêmes sont en
 * base, chargés depuis `prisma/seed-data/instruments.js`.
 */

export const INSTRUMENT_FAMILIES = [
	'VOICE',
	'PLUCKED_STRINGS',
	'BOWED_STRINGS',
	'KEYBOARDS',
	'DRUMS_PERCUSSION',
	'BRASS',
	'WOODWINDS',
	'ELECTRONIC',
	'WORLD'
] as const;

export type InstrumentFamilyValue = (typeof INSTRUMENT_FAMILIES)[number];

export const INSTRUMENT_FAMILY_LABELS: Readonly<Record<InstrumentFamilyValue, string>> = {
	VOICE: 'Voix',
	PLUCKED_STRINGS: 'Cordes pincées',
	BOWED_STRINGS: 'Cordes frottées',
	KEYBOARDS: 'Claviers',
	DRUMS_PERCUSSION: 'Batterie et percussions',
	BRASS: 'Cuivres',
	WOODWINDS: 'Bois et anches',
	ELECTRONIC: 'Électronique',
	WORLD: 'Instruments du monde'
};
