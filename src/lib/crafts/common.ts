/**
 * Ce que partagent les profils des métiers du son (P4-02, P4-04) : où la
 * personne travaille, ses travaux en écoute, les listes en texte libre.
 * Module pur, partagé par le serveur et le navigateur.
 */
import { checkLink, type LinkCheck } from '#lib/actors/profile';

/** Où la personne travaille. Alignées sur l'enum Prisma `CraftMobility`. */
export const CRAFT_MOBILITY = ['OWN_PLACE', 'ON_SITE', 'REMOTE'] as const;
export type CraftMobilityValue = (typeof CRAFT_MOBILITY)[number];

export const CRAFT_MOBILITY_LABELS: Readonly<Record<CraftMobilityValue, string>> = {
	OWN_PLACE: 'Dans mon studio ou mon home studio',
	ON_SITE: 'Je me déplace (salle, local, studio des artistes)',
	REMOTE: 'À distance (on m’envoie les pistes)'
};

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

/** Liste en texte libre (matériel, logiciels) : espaces resserrés, lignes vides retirées. */
export function normalizeLines(text: string): string {
	return text
		.split('\n')
		.map((line) => line.trim().replace(/\s+/g, ' '))
		.filter(Boolean)
		.join('\n');
}
