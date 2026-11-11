/**
 * Vérification manuelle d'une organisation (P3-09, conception 02 §4) : règles
 * pures, partagées par le serveur et le navigateur.
 *
 * - La gestion d'une organisation (groupe, studio ; OWNER ou ADMIN) fournit
 *   un **SIRET** (clé de Luhn) et un **lien officiel** (site ou réseau
 *   social, en https). Le SIRET est d'abord cherché dans la base Sirene
 *   (P5-02) : inconnu ou fermé, il est refusé. La modération contrôle
 *   ensuite à la main et accorde, ou refuse avec un motif ; elle peut aussi
 *   retirer la vérification (les étapes déjà vérifiées restent, Q22).
 * - Une demande en attente à la fois ; trois demandes au plus sur 30 jours.
 * - « Vérifié » est un statut accordé, pas un niveau gagné : il ne rapporte
 *   aucune XP et n'entre dans aucun calcul de confiance.
 */
import { z } from 'zod';
import { isValidSiret, normalizeSiret } from '#lib/venues/siret';

export const MAX_REQUESTS_30_DAYS = 3;
export const MAX_URL = 300;
export const MAX_REASON = 300;

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
	if (!input.isManager) return 'Seules les personnes qui la gèrent peuvent faire cela.';
	if (input.dissolved) return 'Cette organisation est dissoute.';
	if (input.verified) return 'Cette organisation est déjà vérifiée.';
	if (input.pending) return 'Une demande est déjà en cours d’examen.';
	if (input.recentRequests >= MAX_REQUESTS_30_DAYS) {
		return 'Trois demandes ce mois-ci : réessaie un peu plus tard.';
	}
	return null;
}

/**
 * Contrôle automatique du SIRET (P5-02) : l'établissement trouvé dans la
 * base Sirene (ou `null`). Message de refus, ou `null` s'il est actif.
 */
export function establishmentBlocker(found: { active: boolean } | null): string | null {
	if (!found) {
		return 'Ce SIRET est introuvable dans la base des entreprises : vérifie-le sur ton avis de situation Sirene.';
	}
	if (!found.active) {
		return 'Cet établissement est fermé dans la base des entreprises : donne le SIRET de l’établissement actif.';
	}
	return null;
}

/** Lien vers la fiche publique de l'établissement, pour la modération. */
export const annuaireUrl = (siret: string) =>
	`https://annuaire-entreprises.data.gouv.fr/etablissement/${siret}`;
