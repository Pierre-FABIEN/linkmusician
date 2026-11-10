/**
 * Récap de campagne d'un morceau (P4-10) : règles pures, partagées par le
 * serveur et le navigateur. La campagne est **bouclée** quand le morceau a
 * son son final : masterisé ou produit.
 */

export type JourneyKind = 'IDEA' | 'COMPOSED' | 'RECORDING' | 'MIXING' | 'MASTERING' | 'PRODUCTION';

export type JourneyStep = {
	kind: JourneyKind;
	at: Date;
	/** La personne du son qui a assuré l'étape, si son profil est visible. */
	pro: { handle: string; name: string } | null;
	/** Le studio où elle s'est tenue, si sa fiche est publiée. */
	studio: { handle: string; name: string } | null;
	/** Cet enregistrement a vérifié l'étape « Premier enregistrement » du groupe. */
	verified: boolean;
	/** Pour la composition : personnes créditées et confirmées. */
	people?: number;
};

export const JOURNEY_LABELS: Readonly<Record<JourneyKind, string>> = {
	IDEA: 'L’idée notée',
	COMPOSED: 'Composé',
	RECORDING: 'Enregistré',
	MIXING: 'Mixé',
	MASTERING: 'Masterisé',
	PRODUCTION: 'Produit'
};

/** Ce que la personne du son a fait, pour « Enregistré par Sam ». */
export const JOURNEY_BY: Readonly<Partial<Record<JourneyKind, string>>> = {
	RECORDING: 'prise de son',
	MIXING: 'mixage',
	MASTERING: 'mastering',
	PRODUCTION: 'production'
};

export function campaignDone(work: { masteredAt: Date | null; producedAt: Date | null }): boolean {
	return work.masteredAt !== null || work.producedAt !== null;
}

/** Nombre de jours entiers entre deux dates (au moins 1). */
export function campaignDays(from: Date, to: Date): number {
	return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}
