/**
 * Profil d'ingé son (P4-02, conception 08 §5) : référentiel et règles.
 * Module pur, partagé par le serveur et le navigateur. Les libellés vivent
 * ici, jamais en dur dans les composants.
 *
 * Tout est déclaratif. Les travaux en écoute sont des liens que la personne
 * ajoute elle-même ; les crédits confirmés par les artistes viendront avec
 * P4-07, et seuls eux prouveront quelque chose.
 */
import { checkLink, type LinkCheck } from '#lib/actors/profile';

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

/** Où la personne travaille. Alignées sur l'enum Prisma `CraftMobility`. */
export const CRAFT_MOBILITY = ['OWN_PLACE', 'ON_SITE', 'REMOTE'] as const;
export type CraftMobilityValue = (typeof CRAFT_MOBILITY)[number];

export const CRAFT_MOBILITY_LABELS: Readonly<Record<CraftMobilityValue, string>> = {
	OWN_PLACE: 'Dans mon studio ou mon home studio',
	ON_SITE: 'Je me déplace (salle, local, studio des artistes)',
	REMOTE: 'À distance (on m’envoie les pistes)'
};

export const MAX_GEAR_LENGTH = 600;
export const MAX_REFERENCES = 6;
export const MAX_REFERENCE_TITLE = 80;

export type ReferenceInput = { title: string; url: string };
export type Reference = { title: string; url: string };

export type ReferenceCheck =
	{ ok: true; reference: Reference } | { ok: false; field: 'title' | 'url'; message: string };

const URL_MESSAGES: Record<Exclude<LinkCheck, { ok: true }>['reason'], string> = {
	format: 'Adresse invalide.',
	host: 'Adresse invalide.',
	too_long: 'Adresse trop longue.'
};

/** Un travail en écoute : un titre lisible et un lien public (tout domaine). */
export function checkReference(input: ReferenceInput): ReferenceCheck {
	const title = input.title.trim().replace(/\s+/g, ' ');
	if (title.length === 0) return { ok: false, field: 'title', message: 'Donne-lui un titre.' };
	if (title.length > MAX_REFERENCE_TITLE)
		return { ok: false, field: 'title', message: `${MAX_REFERENCE_TITLE} caractères au plus.` };
	const link = checkLink('WEBSITE', input.url);
	if (!link.ok) return { ok: false, field: 'url', message: URL_MESSAGES[link.reason] };
	return { ok: true, reference: { title, url: link.url } };
}

/** Matériel : texte libre, espaces resserrés, lignes vides retirées. */
export function normalizeGear(text: string): string {
	return text
		.split('\n')
		.map((line) => line.trim().replace(/\s+/g, ' '))
		.filter(Boolean)
		.join('\n');
}

/** Ce qu'il faut pour apparaître dans la recherche par métier : une spécialité. */
export function isSoundProfileListed(profile: { specialties: readonly unknown[] }): boolean {
	return profile.specialties.length > 0;
}
