/**
 * Organisations d'organisateur·rices (P5-05b, conception 06 §3.6 et 08 §8) :
 * association, collectif ou festival géré à plusieurs, sur le modèle du
 * studio (P4-03). Règles pures, partagées par le serveur et le navigateur.
 *
 * L'organisation publie des plateaux en son nom ; vérifiée (SIRET, P5-02),
 * elle fera passer les concerts au niveau `VERIFIED` (P5-06). Elle ne gagne
 * jamais d'XP : les points vont aux personnes.
 */
import { z } from 'zod';
import { normalizeBio } from '#lib/actors/profile';
import { MAX_CAPACITY, MAX_PROMOTER_GENRES, PROMOTER_EVENT_KINDS } from '#lib/crafts/promoter';

export const MAX_PROMOTER_ORG_NAME = 60;
export const MAX_PROMOTER_ORG_BIO = 600;
/** Organisations gérées par une même personne. */
export const MAX_MANAGED_PROMOTER_ORGS = 3;
/** Invitations à la co-gestion en attente, par organisation. */
export const MAX_PENDING_ORG_INVITES = 5;

/** Texte brut sur une ligne : contrôles retirés, espaces resserrés. */
function oneLine(raw: string): string {
	return (
		raw
			// eslint-disable-next-line no-control-regex
			.replace(/[\u0000-\u001f\u007f]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	);
}

const name = z
	.string({ required_error: 'Donne un nom à l’organisation.' })
	.transform(oneLine)
	.refine((v) => [...v].length >= 2, { message: 'Le nom fait au moins 2 caractères.' })
	.refine((v) => [...v].length <= MAX_PROMOTER_ORG_NAME, {
		message: `Le nom tient en ${MAX_PROMOTER_ORG_NAME} caractères.`
	});

/** Création : un nom suffit, la fiche se remplit ensuite. */
export const promoterOrgSchema = z.object({ name });
export type PromoterOrgForm = z.infer<typeof promoterOrgSchema>;

/** Fiche, envoyée en formulaire classique (cases à cocher répétées). */
export const promoterOrgProfileSchema = z.object({
	name,
	bio: z
		.string()
		.optional()
		.transform((v) => normalizeBio(v ?? ''))
		.refine((v) => [...v].length <= MAX_PROMOTER_ORG_BIO, {
			message: `La présentation tient en ${MAX_PROMOTER_ORG_BIO} caractères.`
		})
		.transform((v) => v || null),
	eventKinds: z
		.array(z.enum(PROMOTER_EVENT_KINDS))
		.transform((list) => PROMOTER_EVENT_KINDS.filter((k) => list.includes(k))),
	genreIds: z
		.array(z.string().min(1).max(60))
		.transform((list) => [...new Set(list)])
		.refine((list) => list.length <= MAX_PROMOTER_GENRES, {
			message: `${MAX_PROMOTER_GENRES} genres au plus.`
		}),
	capacity: z
		.string()
		.optional()
		.transform((v) => v?.trim() ?? '')
		.refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= MAX_CAPACITY), {
			message: `Une jauge en nombre de personnes, de 1 à ${MAX_CAPACITY.toLocaleString('fr-FR')}.`
		})
		.transform((v) => (v === '' ? null : Number(v))),
	communeCode: z
		.string()
		.optional()
		.transform((v) => v?.trim() || null)
		.refine((v) => v === null || /^[0-9AB]{5}$/.test(v), {
			message: 'Choisis une commune dans la liste.'
		})
});
export type PromoterOrgProfileForm = z.infer<typeof promoterOrgProfileSchema>;

/** Ce qui manque à la fiche pour publier un plateau au nom de l'organisation. */
export function gigSlotGaps(org: { hasCommune: boolean; eventKinds: readonly unknown[] }) {
	const gaps: string[] = [];
	if (!org.hasCommune) gaps.push('la ville de l’organisation');
	if (org.eventKinds.length === 0) gaps.push('ce qu’elle organise');
	return gaps;
}
