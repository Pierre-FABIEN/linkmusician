/**
 * Jams signalées (#91b, RV-01) : règles pures, partagées par le serveur et
 * le navigateur.
 *
 * - On signale **depuis le terrain**, du début de la jam à 24 h après sa fin,
 *   si l'on était inscrit·e (« Je viens » ou invitation acceptée) **avant**
 *   le début. « J'y étais » n'est jamais une preuve de tenue.
 * - Le nombre de signalements **priorise** le dossier (2 indépendants),
 *   il ne sanctionne jamais : seule la modération confirme un manquement.
 * - La restriction ne touche que l'organisation de jams.
 */
import { z } from 'zod';

export const REPORT_WINDOW_AFTER_END_MS = 24 * 3_600_000;
/** À partir de ce nombre de signalements, le dossier passe en priorité. */
export const PRIORITY_REPORTS = 2;
/** Un compte plus jeune est signalé comme récent à la modération (collusion, faux comptes). */
export const RECENT_ACCOUNT_DAYS = 7;
export const MAX_REPORT_DETAILS = 1000;
export const MAX_ORGANIZER_RESPONSE = 1000;

export const INCIDENT_REASONS = ['NO_JAM', 'VENUE_UNAWARE', 'VENUE_CLOSED', 'OTHER'] as const;
export type IncidentReasonValue = (typeof INCIDENT_REASONS)[number];

export const INCIDENT_REASON_LABELS: Record<IncidentReasonValue, string> = {
	NO_JAM: 'Aucune jam à cette adresse',
	VENUE_UNAWARE: 'Le lieu n’était pas au courant',
	VENUE_CLOSED: 'Le lieu était fermé',
	OTHER: 'Autre problème'
};

/** La fenêtre de signalement : du début à 24 h après la fin. */
export function isReportWindowOpen(jam: { startsAt: Date; endsAt: Date }, now = new Date()) {
	return (
		now.getTime() >= jam.startsAt.getTime() &&
		now.getTime() <= jam.endsAt.getTime() + REPORT_WINDOW_AFTER_END_MS
	);
}

export const jamReportSchema = z.object({
	reason: z.enum(INCIDENT_REASONS, { message: 'Choisis ce qui s’est passé.' }),
	// Déclaration explicite, jamais déduite d'un GPS.
	wentThere: z.literal(true, { message: 'Coche « Je me suis rendu·e sur place ».' }),
	details: z.string().trim().max(MAX_REPORT_DETAILS).default('')
});
export type JamReportForm = z.infer<typeof jamReportSchema>;

/** Décisions de la modération sur un dossier. */
export const INCIDENT_SANCTIONS = [
	'none',
	'warning',
	'restrict7',
	'restrict30',
	'restrictIndefinite'
] as const;
export type IncidentSanctionValue = (typeof INCIDENT_SANCTIONS)[number];

export const INCIDENT_SANCTION_LABELS: Record<IncidentSanctionValue, string> = {
	none: 'Aucune suite',
	warning: 'Avertissement (première erreur de bonne foi)',
	restrict7: 'Interdiction d’organiser 7 jours',
	restrict30: 'Interdiction d’organiser 30 jours',
	restrictIndefinite: 'Interdiction d’organiser, sans limite (abus répétés ou graves)'
};

/** Durée d'une restriction, en jours ; `null` : sans limite ; `undefined` : pas de restriction. */
export function restrictionDays(s: IncidentSanctionValue): number | null | undefined {
	if (s === 'restrict7') return 7;
	if (s === 'restrict30') return 30;
	if (s === 'restrictIndefinite') return null;
	return undefined;
}

export const incidentDecisionSchema = z
	.object({
		decision: z.enum(['dismiss', 'confirm']),
		sanction: z.enum(INCIDENT_SANCTIONS).default('none'),
		note: z.string().trim().min(3, 'Explique la décision.').max(1000)
	})
	.refine((v) => v.decision === 'confirm' || v.sanction === 'none', {
		message: 'Un dossier classé ne donne lieu à aucune sanction.',
		path: ['sanction']
	});
export type IncidentDecisionForm = z.infer<typeof incidentDecisionSchema>;
