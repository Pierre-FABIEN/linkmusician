/**
 * Confiance (trust levels, conception 02 §7), inspirée de Discourse :
 * recalculée à chaque événement significatif et chaque nuit, rétrogradable.
 * L'XP n'entre **jamais** dans ce calcul (règle d'étanchéité, §1).
 */

export type TrustLevel = 0 | 1 | 2 | 3;

export type TrustSummary = {
	emailVerified: boolean;
	accountAgeDays: number;
	profileComplete: boolean;
	reciprocalConversations: number;
	/** Sanctions de modération en cours. */
	activeSanctions: number;
	/** Collaborations confirmées avec une contrepartie de confiance ≥ 1. */
	collaborationsWithTrusted: number;
	distinctCounterparts: number;
	/** Part des contenus de la personne signalés et retenus (0 à 1). */
	reportRate: number;
};

export const TRUST_NAMES: Readonly<Record<TrustLevel, string>> = {
	0: 'Nouveau',
	1: 'Membre',
	2: 'Confirmé',
	3: 'Pilier'
};

/** Taux de signalement au-delà duquel le palier 3 est refusé. */
export const MAX_REPORT_RATE_TL3 = 0.02;

export function computeTrustLevel(s: TrustSummary): TrustLevel {
	const tl1 =
		s.emailVerified &&
		s.accountAgeDays >= 7 &&
		s.profileComplete &&
		s.reciprocalConversations >= 1 &&
		s.activeSanctions === 0;
	if (!tl1) return 0;
	if (!(s.accountAgeDays >= 30 && s.collaborationsWithTrusted >= 1)) return 1;
	if (!(
		s.accountAgeDays >= 90 &&
		s.distinctCounterparts >= 5 &&
		s.reportRate <= MAX_REPORT_RATE_TL3
	)) {
		return 2;
	}
	return 3;
}

/** Droits et quotas par palier (conception 02 §7). */
export const TRUST_PERMISSIONS: Readonly<
	Record<
		TrustLevel,
		{
			dailyFirstMessages: number;
			activeOpportunities: number;
			mediaItems: number;
			canEndorse: boolean;
			canCorroborate: boolean;
		}
	>
> = {
	0: {
		dailyFirstMessages: 10,
		activeOpportunities: 1,
		mediaItems: 3,
		canEndorse: false,
		canCorroborate: false
	},
	1: {
		dailyFirstMessages: 30,
		activeOpportunities: 3,
		mediaItems: 3,
		canEndorse: true,
		canCorroborate: false
	},
	2: {
		dailyFirstMessages: 60,
		activeOpportunities: 5,
		mediaItems: 10,
		canEndorse: true,
		canCorroborate: true
	},
	3: {
		dailyFirstMessages: 100,
		activeOpportunities: 10,
		mediaItems: 20,
		canEndorse: true,
		canCorroborate: true
	}
};
