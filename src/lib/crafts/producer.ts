/**
 * Profil de producteur·rice (P4-04, conception 08 §7) : référentiel et
 * règles. Module pur, partagé par le serveur et le navigateur.
 *
 * Tout est déclaratif, y compris les tarifs, toujours affichés comme
 * « indicatifs ». Les productions confirmées par les artistes viendront
 * avec les collaborations liées au morceau (P4-06) et les crédits (P4-07).
 */
import { normalizeLines } from './common';

/** Spécialités, dans l'ordre d'affichage. Alignées sur l'enum Prisma `ProducerSpecialty`. */
export const PRODUCER_SPECIALTIES = ['PRODUCTION', 'ARRANGEMENT', 'BEATMAKING'] as const;
export type ProducerSpecialtyValue = (typeof PRODUCER_SPECIALTIES)[number];

export const PRODUCER_SPECIALTY_INFO: Readonly<
	Record<ProducerSpecialtyValue, { label: string; hint: string }>
> = {
	PRODUCTION: {
		label: 'Production',
		hint: 'Porter un titre de la maquette au son final, avec les artistes.'
	},
	ARRANGEMENT: { label: 'Arrangement', hint: 'Écrire les parties, la structure, les couleurs.' },
	BEATMAKING: { label: 'Beatmaking', hint: 'Composer des instrus pour des artistes.' }
};

/** Styles produits : genres du référentiel, 5 au plus. */
export const MAX_PRODUCER_GENRES = 5;
export const MAX_SOFTWARE_LENGTH = 300;
export const MAX_RATE_LENGTH = 160;

/** Logiciels : une ligne par élément. */
export const normalizeSoftware = normalizeLines;

/** Tarifs indicatifs : une phrase, espaces resserrés (« À partir de 150 € le titre »). */
export function normalizeRate(text: string): string {
	return text.trim().replace(/\s+/g, ' ');
}

/** Ce qu'il faut pour apparaître dans la recherche par métier : une spécialité. */
export function isProducerProfileListed(profile: { specialties: readonly unknown[] }): boolean {
	return profile.specialties.length > 0;
}
