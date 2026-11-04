/**
 * Modération (P1-12) : motifs, sanctions actives, taux de signalement.
 * Module pur.
 */

export const REPORT_REASONS = [
	'SPAM',
	'INAPPROPRIATE',
	'HARASSMENT',
	'IMPERSONATION',
	'NOT_MINE',
	'OTHER'
] as const;
export type ReportReasonValue = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Readonly<Record<ReportReasonValue, string>> = {
	SPAM: 'Spam ou publicité',
	INAPPROPRIATE: 'Contenu inapproprié',
	HARASSMENT: 'Harcèlement ou propos haineux',
	IMPERSONATION: 'Usurpation d’identité',
	NOT_MINE: 'Contenu qui ne lui appartient pas',
	OTHER: 'Autre'
};

export const MAX_REPORT_DETAILS = 500;
/** Signalements qu'un acteur peut faire par jour (anti-abus). */
export const DAILY_REPORTS = 10;
/** Durée d'effet d'un avertissement sur la confiance. */
export const WARNING_DAYS = 30;
/** Durées de suspension proposées (`null` : jusqu'à levée). */
export const SUSPENSION_DAYS = [7, 30, null] as const;

export type SanctionLike = {
	kind: 'WARNING' | 'SUSPENSION';
	until: Date | null;
	liftedAt: Date | null;
};

/** Sanction en vigueur : ni levée, ni expirée. */
export function isSanctionActive(s: SanctionLike, now = new Date()): boolean {
	return s.liftedAt === null && (s.until === null || s.until > now);
}

/** Suspension en vigueur, la plus longue, ou `null`. */
export function activeSuspension<S extends SanctionLike>(
	sanctions: readonly S[],
	now = new Date()
): S | null {
	const active = sanctions.filter((s) => s.kind === 'SUSPENSION' && isSanctionActive(s, now));
	if (active.length === 0) return null;
	return (
		active.find((s) => s.until === null) ?? [...active].sort((a, b) => +b.until! - +a.until!)[0]
	);
}

/**
 * Taux de signalement retenu (confiance, palier 3) : signalements retenus sur
 * le nombre de médias publiés, avec un plancher de 10 pour qu'un seul
 * signalement ne fasse pas basculer un nouveau membre.
 */
export const REPORT_RATE_FLOOR = 10;
export function reportRate(actionedReports: number, publishedMedia: number): number {
	return actionedReports / Math.max(REPORT_RATE_FLOOR, publishedMedia);
}

/** Texte libre d'un signalement : texte brut, une seule ligne de blancs, borné. */
export function normalizeDetails(text: string): string {
	return (
		text
			.replace(/\r\n?/g, '\n')
			// eslint-disable-next-line no-control-regex -- on retire justement ces caractères
			.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
			.replace(/[ \t]+/g, ' ')
			.replace(/\n{3,}/g, '\n\n')
			.trim()
			.slice(0, MAX_REPORT_DETAILS)
	);
}

export function addDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
