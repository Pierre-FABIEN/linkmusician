/**
 * Profil d'ingé son (P4-02, conception 08 §5) : référentiel et règles.
 * Module pur, partagé par le serveur et le navigateur. Les libellés vivent
 * ici, jamais en dur dans les composants.
 *
 * Tout est déclaratif. Les travaux en écoute sont des liens que la personne
 * ajoute elle-même ; les crédits confirmés par les artistes viendront avec
 * P4-07, et seuls eux prouveront quelque chose.
 */
import { normalizeLines } from './common';

export {
	checkReference,
	CRAFT_MOBILITY,
	CRAFT_MOBILITY_LABELS,
	MAX_REFERENCE_TITLE,
	MAX_REFERENCES,
	type CraftMobilityValue,
	type Reference,
	type ReferenceCheck,
	type ReferenceInput
} from './common';

/** Spécialités, dans l'ordre d'affichage. Alignées sur l'enum Prisma `SoundSpecialty`. */
export const SOUND_SPECIALTIES = [
	'RECORDING',
	'MIXING',
	'MASTERING',
	'LIVE_FOH',
	'LIVE_MONITORS'
] as const;
export type SoundSpecialtyValue = (typeof SOUND_SPECIALTIES)[number];

export const SOUND_SPECIALTY_INFO: Readonly<
	Record<SoundSpecialtyValue, { label: string; hint: string }>
> = {
	RECORDING: { label: 'Prise de son', hint: 'Enregistrer en studio ou en extérieur.' },
	MIXING: { label: 'Mixage', hint: 'Équilibrer, traiter et spatialiser les pistes.' },
	MASTERING: { label: 'Mastering', hint: 'Finaliser un titre ou un EP pour la diffusion.' },
	LIVE_FOH: { label: 'Façade', hint: 'Le son de la salle pendant un concert.' },
	LIVE_MONITORS: { label: 'Retours', hint: 'Le son que les musicien·nes entendent sur scène.' }
};

export const MAX_GEAR_LENGTH = 600;

/** Matériel : une ligne par élément. */
export const normalizeGear = normalizeLines;

/** Ce qu'il faut pour apparaître dans la recherche par métier : une spécialité. */
export function isSoundProfileListed(profile: { specialties: readonly unknown[] }): boolean {
	return profile.specialties.length > 0;
}
