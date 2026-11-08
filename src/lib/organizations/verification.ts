/**
 * Vérification manuelle d'une organisation (P3-09, conception 02 §4) : règles
 * pures, partagées par le serveur et le navigateur.
 *
 * - La gestion d'un groupe (OWNER ou ADMIN) fournit un **SIRET** (clé de
 *   Luhn) et un **lien officiel** (site ou réseau social, en https). La
 *   modération contrôle à la main et accorde, ou refuse avec un motif.
 * - Une demande en attente à la fois ; trois demandes au plus sur 30 jours.
 * - « Vérifié » est un statut accordé, pas un niveau gagné : il ne rapporte
 *   aucune XP et n'entre dans aucun calcul de confiance.
 */
import { z } from 'zod';
import { isValidSiret, normalizeSiret } from '#lib/venues/siret';

export const MAX_REQUESTS_30_DAYS = 3;
export const MAX_URL = 300;

export const verificationSchema = z.object({
	siret: z
		.string()
		.transform(normalizeSiret)
		.refine(isValidSiret, { message: 'Ce SIRET n’est pas valide (14 chiffres).' }),
	officialUrl: z
		.string()
		.trim()
		.max(MAX_URL, { message: 'Ce lien est trop long.' })
		.refine(
			(v) => {
				try {
					const u = new URL(v);
					return u.protocol === 'https:' && u.hostname.includes('.');
				} catch {
					return false;
				}
			},
			{ message: 'Indique le lien officiel complet, en https://.' }
		)
});
export type VerificationInput = z.infer<typeof verificationSchema>;

/** Peut-on demander la vérification ? Message de refus, ou `null`. */
export function requestBlocker(input: {
	isManager: boolean;
	verified: boolean;
	dissolved: boolean;
	pending: boolean;
	recentRequests: number;
}): string | null {
	if (!input.isManager) return 'Seules les personnes qui gèrent le groupe peuvent faire cela.';
	if (input.dissolved) return 'Ce groupe est dissous.';
	if (input.verified) return 'Ce groupe est déjà vérifié.';
	if (input.pending) return 'Une demande est déjà en cours d’examen.';
	if (input.recentRequests >= MAX_REQUESTS_30_DAYS) {
		return 'Trois demandes ce mois-ci : réessaie un peu plus tard.';
	}
	return null;
}

/** Lien vers la fiche publique de l'établissement, pour la modération. */
export const annuaireUrl = (siret: string) =>
	`https://annuaire-entreprises.data.gouv.fr/etablissement/${siret}`;
