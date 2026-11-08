/**
 * Contestation et retrait d'une étape de groupe (P3-06, conception 02 §4,
 * D49) : règles pures, partagées par le serveur et le navigateur.
 *
 * - On conteste une étape **déclarée par le groupe** (mode `declare`) : la
 *   formation et la composition suivent des faits de la plateforme
 *   (adhésions, morceaux) et ne se contestent pas ainsi.
 * - Un signalement d'une personne de confiance (palier 1 au moins) **gèle**
 *   l'étape : elle ne s'affiche plus comme prouvée et ne reçoit plus de
 *   preuve jusqu'à la décision. Celui d'un compte récent attend la
 *   modération sans geler (un compte neuf ne bloque pas un groupe).
 * - Retenue : l'XP de l'étape est reprise (transactions négatives liées),
 *   l'étape est retirée, et qui l'a déclarée comme qui l'a confirmée reçoit
 *   un avertissement de confiance. Rejetée : l'étape est dégelée.
 * - La gestion du groupe peut **retirer** une étape déclarée par erreur
 *   (même reprise d'XP), sauf quand elle est gelée.
 */
import { milestoneDef, type MilestoneKey } from './rules';

/** Palier de confiance à partir duquel un signalement gèle l'étape. */
export const FREEZE_MIN_TRUST = 1;
export const MIN_CONTEST_DETAILS = 10;

/** Étape qui se conteste et se retire (déclarée par le groupe). */
export function isContestable(key: MilestoneKey): boolean {
	return milestoneDef(key).mode === 'declare';
}

export function freezesOnReport(reporterTrust: number): boolean {
	return reporterTrust >= FREEZE_MIN_TRUST;
}

export type ContestRefusal = 'not_contestable' | 'own' | 'too_short';

export const CONTEST_ERRORS: Record<ContestRefusal, string> = {
	not_contestable: 'Cette étape ne se conteste pas.',
	own: 'Tu fais partie de ce groupe : retire l’étape depuis la gestion du groupe.',
	too_short: `Explique en quelques mots ce qui ne va pas (${MIN_CONTEST_DETAILS} caractères au moins).`
};

/** Peut-on contester ? `null` si oui. */
export function contestRefusal(input: {
	key: MilestoneKey;
	/** Membre actif du groupe : il ou elle passe par la gestion. */
	reporterIsMember: boolean;
	details: string;
}): ContestRefusal | null {
	if (!isContestable(input.key)) return 'not_contestable';
	if (input.reporterIsMember) return 'own';
	if ([...input.details.trim()].length < MIN_CONTEST_DETAILS) return 'too_short';
	return null;
}

/** Peut-on retirer soi-même l'étape ? Message de refus, ou `null`. */
export function retractBlocker(input: {
	key: MilestoneKey;
	frozen: boolean;
	dissolved: boolean;
}): string | null {
	if (!isContestable(input.key)) return 'Cette étape se met à jour toute seule.';
	if (input.dissolved) return 'Ce groupe est dissous.';
	if (input.frozen) return 'Cette étape est en vérification : la modération va trancher.';
	return null;
}

/** Libellé public d'une étape gelée (au lieu de son niveau de preuve). */
export const FROZEN_LABEL = 'En vérification';
