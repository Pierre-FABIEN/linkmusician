/**
 * Journal de modération (P3-09) : libellés lisibles des actions tracées dans
 * `AdminAuditLog` (`logAdminAction`). Module pur. Un test vérifie que chaque
 * action de modération écrite dans le code a son libellé : aucune décision
 * n'échappe au journal lisible.
 */

export const AUDIT_ACTIONS = {
	'moderation.media.approve': { label: 'Média publié', family: 'media' },
	'moderation.media.reject': { label: 'Média refusé ou retiré', family: 'media' },
	'moderation.report.dismiss': { label: 'Signalement classé', family: 'reports' },
	'moderation.sanction.warning': { label: 'Avertissement', family: 'reports' },
	'moderation.sanction.suspension': { label: 'Suspension', family: 'reports' },
	'moderation.sanction.lift': { label: 'Sanction levée', family: 'reports' },
	'moderation.opportunity.remove': { label: 'Annonce retirée', family: 'opportunities' },
	'moderation.venue.validate': { label: 'Lieu validé', family: 'venues' },
	'moderation.venue.remove': { label: 'Lieu retiré', family: 'venues' },
	'moderation.venue_claim.approve': { label: 'Revendication de lieu approuvée', family: 'venues' },
	'moderation.venue_claim.reject': { label: 'Revendication de lieu refusée', family: 'venues' },
	'moderation.collusion.confirm': { label: 'Collusion confirmée', family: 'collusion' },
	'moderation.collusion.dismiss': { label: 'Cercle fermé classé', family: 'collusion' },
	'moderation.milestone_evidence.accept': {
		label: 'Preuve d’étape acceptée',
		family: 'milestones'
	},
	'moderation.milestone_evidence.reject': { label: 'Preuve d’étape refusée', family: 'milestones' },
	'moderation.milestone.uphold': { label: 'Contestation d’étape retenue', family: 'milestones' },
	'moderation.milestone.dismiss': { label: 'Contestation d’étape rejetée', family: 'milestones' },
	'moderation.milestone.reject': { label: 'Étape signalée invalidée', family: 'milestones' },
	'moderation.organization.approve': { label: 'Organisation vérifiée', family: 'organizations' },
	'moderation.organization.reject': {
		label: 'Vérification d’organisation refusée',
		family: 'organizations'
	},
	'moderation.organization.revoke': {
		label: 'Vérification d’organisation retirée',
		family: 'organizations'
	},
	'moderation.jam_incident.dismiss': { label: 'Jam signalée : classée', family: 'jams' },
	'moderation.jam_incident.confirm': { label: 'Jam signalée : manquement confirmé', family: 'jams' },
	'moderation.jam_restriction.create': { label: 'Interdiction d’organiser des jams', family: 'jams' },
	'moderation.jam_restriction.lift': {
		label: 'Interdiction d’organiser levée (recours)',
		family: 'jams'
	}
} as const satisfies Record<string, { label: string; family: string }>;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export const AUDIT_FAMILIES = {
	media: 'Médias',
	reports: 'Signalements et sanctions',
	opportunities: 'Annonces',
	venues: 'Lieux',
	collusion: 'Cercles fermés',
	milestones: 'Étapes de groupe',
	organizations: 'Organisations',
	jams: 'Jams signalées'
} as const;
export type AuditFamily = keyof typeof AUDIT_FAMILIES;

export function isAuditFamily(value: unknown): value is AuditFamily {
	return typeof value === 'string' && value in AUDIT_FAMILIES;
}

/** Actions d'une famille (filtre du journal). */
export function actionsOf(family: AuditFamily): AuditAction[] {
	return (Object.keys(AUDIT_ACTIONS) as AuditAction[]).filter(
		(a) => AUDIT_ACTIONS[a].family === family
	);
}

/** Libellé d'une action ; l'identifiant brut si elle est inconnue (boilerplate). */
export function auditLabel(action: string): string {
	return (AUDIT_ACTIONS as Record<string, { label: string }>)[action]?.label ?? action;
}

/** Toutes les actions de modération (pour lister le journal). */
export const MODERATION_PREFIX = 'moderation.';
