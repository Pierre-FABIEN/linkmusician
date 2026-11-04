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

/** Une condition du palier suivant, pour l'afficher (« 7 jours d'ancienneté »). */
export type TrustRequirement = { label: string; met: boolean };

/**
 * Conditions du palier immédiatement supérieur, chacune marquée remplie ou
 * non. Tableau vide au palier 3. Les libellés sont ceux montrés à la personne.
 */
export function nextTrustRequirements(s: TrustSummary): {
	next: TrustLevel | null;
	requirements: TrustRequirement[];
} {
	const level = computeTrustLevel(s);
	if (level === 0) {
		return {
			next: 1,
			requirements: [
				{ label: 'Adresse email vérifiée', met: s.emailVerified },
				{ label: '7 jours d’ancienneté', met: s.accountAgeDays >= 7 },
				{ label: 'Profil complété', met: s.profileComplete },
				{ label: 'Un premier échange réciproque', met: s.reciprocalConversations >= 1 },
				{ label: 'Aucune sanction en cours', met: s.activeSanctions === 0 }
			]
		};
	}
	if (level === 1) {
		return {
			next: 2,
			requirements: [
				{ label: '30 jours d’ancienneté', met: s.accountAgeDays >= 30 },
				{
					label: 'Une collaboration confirmée avec un membre de confiance',
					met: s.collaborationsWithTrusted >= 1
				}
			]
		};
	}
	if (level === 2) {
		return {
			next: 3,
			requirements: [
				{ label: '90 jours d’ancienneté', met: s.accountAgeDays >= 90 },
				{ label: '5 collaborateurs différents', met: s.distinctCounterparts >= 5 },
				{ label: 'Très peu de signalements retenus', met: s.reportRate <= MAX_REPORT_RATE_TL3 }
			]
		};
	}
	return { next: null, requirements: [] };
}

/** Quotas par jour (limiteurs de débit) et de stock (nombre d'éléments actifs). */
export const DAILY_QUOTAS = ['dailyFirstMessages'] as const;
export const STOCK_QUOTAS = ['activeOpportunities', 'mediaItems'] as const;
export type DailyQuota = (typeof DAILY_QUOTAS)[number];
export type StockQuota = (typeof STOCK_QUOTAS)[number];

export const QUOTA_LABELS: Readonly<Record<DailyQuota | StockQuota, string>> = {
	dailyFirstMessages: 'Premiers messages à des inconnus, par jour',
	activeOpportunities: 'Annonces actives',
	mediaItems: 'Médias publiés'
};

/** Limite d'un quota pour un palier. */
export function quotaLimit(level: TrustLevel, quota: DailyQuota | StockQuota): number {
	return TRUST_PERMISSIONS[level][quota];
}

/** Peut-on ajouter un élément, compte tenu de ceux qui existent déjà ? */
export function canAddWithinStock(level: TrustLevel, quota: StockQuota, current: number): boolean {
	return current < quotaLimit(level, quota);
}

export function isTrustLevel(value: unknown): value is TrustLevel {
	return value === 0 || value === 1 || value === 2 || value === 3;
}
