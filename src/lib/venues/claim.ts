/**
 * Revendication de la fiche d'un lieu, niveau 1 (P5-03a, D31) : règles
 * pures, partagées par le serveur et le navigateur.
 *
 * - Ajouter un lieu reste ouvert à tous ; le **revendiquer** (devenir le
 *   lieu sur LinkMusician) exige une preuve de gestion.
 * - La personne reçoit un code, le publie dans la bio du compte Instagram ou
 *   Facebook officiel du lieu, ou sur une page de son site, puis colle le
 *   lien. La modération contrôle (compte ancien, lié au lieu) et approuve :
 *   l'organisation `VENUE` est créée, gérée par la personne, et la fiche
 *   porte « Géré par le lieu ».
 * - Majeur·es seulement (D5, défaut Q27) ; une revendication ouverte par
 *   personne et par lieu ; trois sur 30 jours ; trois lieux gérés au plus.
 */
import { z } from 'zod';

export const CLAIM_CODE_LENGTH = 8;
/** Sans caractères ambigus (0/O, 1/I/L) : le code se recopie à la main. */
export const CLAIM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const MAX_CLAIMS_30_DAYS = 3;
export const MAX_MANAGED_VENUES = 3;
export const MAX_PROOF_URL = 300;
export const MAX_CLAIM_REASON = 300;

/** Code tiré de `random` (valeurs dans [0, 1)), au format affiché « LM-XXXXXXXX ». */
export function claimCode(random: () => number = Math.random): string {
	let code = '';
	for (let i = 0; i < CLAIM_CODE_LENGTH; i++) {
		code += CLAIM_CODE_ALPHABET[Math.floor(random() * CLAIM_CODE_ALPHABET.length)];
	}
	return code;
}

/** Ce que la personne publie : préfixe lisible + code. */
export const displayedCode = (code: string) => `LM-${code}`;

export const proofUrlSchema = z
	.string()
	.trim()
	.max(MAX_PROOF_URL, { message: 'Ce lien est trop long.' })
	.refine(
		(v) => {
			try {
				const u = new URL(v);
				return u.protocol === 'https:' && u.hostname.includes('.');
			} catch {
				return false;
			}
		},
		{ message: 'Indique le lien complet de la page où le code est publié, en https://.' }
	);

/** Peut-on revendiquer ce lieu ? Message de refus, ou `null`. */
export function claimBlocker(input: {
	adult: boolean;
	validated: boolean;
	claimed: boolean;
	recentClaims: number;
	managedVenues: number;
}): string | null {
	if (!input.adult) return 'Il faut être majeur·e pour gérer un lieu.';
	if (input.claimed) return 'Ce lieu est déjà géré sur LinkMusician.';
	if (!input.validated) return 'Ce lieu doit d’abord être confirmé par un autre membre.';
	if (input.managedVenues >= MAX_MANAGED_VENUES) {
		return `Tu gères déjà ${MAX_MANAGED_VENUES} lieux.`;
	}
	if (input.recentClaims >= MAX_CLAIMS_30_DAYS) {
		return 'Trois revendications ce mois-ci : réessaie un peu plus tard.';
	}
	return null;
}
