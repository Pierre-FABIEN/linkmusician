/**
 * Participant·es d'un projet (P4a, D72 §6.2, §9.1) : règles pures,
 * partagées par le serveur et le navigateur.
 *
 * - Une participation seule ne donne aucun droit sur une réalisation (I2).
 * - Les capacités forment un ensemble fermé (`COORDINATE` seule au MVP),
 *   proposées puis consenties ; seule la gestion du porteur en accorde, et
 *   une capacité n'en accorde aucune (I11).
 * - Une capacité reçue **comme membre** de l'organisation porteuse ne vaut
 *   que tant que la personne en est membre active (§6.3).
 */

export const PROJECT_CAPABILITIES = ['COORDINATE'] as const;
export type ProjectCapabilityValue = (typeof PROJECT_CAPABILITIES)[number];

export const CAPABILITY_LABELS: Record<ProjectCapabilityValue, string> = {
	COORDINATE: 'Coordination'
};

/** Les deux préréglages de l'écran (§9.1) et ce qu'ils permettent. */
export const PRESETS = {
	participant: {
		label: 'Participant·e',
		capabilities: [] as ProjectCapabilityValue[],
		phrase: 'Lit la fiche, les morceaux partagés et l’équipe. Peut quitter le projet.'
	},
	coordinator: {
		label: 'Coordinateur·rice',
		capabilities: ['COORDINATE'] as ProjectCapabilityValue[],
		phrase:
			'En plus : change les dates et la phrase d’objectif, invite des participant·es, range ses propres morceaux. Ne renomme pas, ne clôt pas, ne touche à aucun morceau d’autrui.'
	}
} as const;

export const PARTICIPANT_STATUSES = ['INVITED', 'ACTIVE', 'DECLINED', 'LEFT', 'REMOVED'] as const;
export type ParticipantStatusValue = (typeof PARTICIPANT_STATUSES)[number];
export const OPEN_PARTICIPANT_STATUSES = ['INVITED', 'ACTIVE'] as const;

export const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatusValue, string> = {
	INVITED: 'Invitée',
	ACTIVE: 'Active',
	DECLINED: 'Refusée',
	LEFT: 'Partie',
	REMOVED: 'Retirée'
};

// Quotas anti-abus (comme D66), défauts consignés en Q79.
/** Invitations en attente par projet. */
export const MAX_PENDING_PROJECT_INVITES = 20;
/** Participations ouvertes (invitées et actives) par projet. */
export const MAX_OPEN_PARTICIPANTS = 50;
/** Après un refus, le même projet ne réinvite pas la personne avant ce délai. */
export const REINVITE_AFTER_DECLINE_DAYS = 30;
export const MAX_PARTICIPANT_ROLE = 60;

/**
 * Capacités en vigueur pour un·e participant·e :
 * - aucune hors d'une participation active ;
 * - aucune quand elles ont été reçues comme membre et que la personne n'est
 *   plus membre active de l'organisation porteuse (§6.3) ;
 * - aucune pour un·e mineur·e (D46, Q-G0-12), même si une ligne en porte.
 */
export function effectiveCapabilities(input: {
	status: ParticipantStatusValue;
	capabilities: readonly ProjectCapabilityValue[];
	asMember: boolean;
	memberNow: boolean;
	minor: boolean;
}): ProjectCapabilityValue[] {
	if (input.status !== 'ACTIVE' || input.minor) return [];
	if (input.asMember && !input.memberNow) return [];
	return [...new Set(input.capabilities)];
}

export type ProjectRoleValue = 'manage' | 'coordinate' | 'participate';

/** Le rôle affiché découle des droits relus, jamais d'une valeur stockée. */
export function projectRole(input: {
	manage: boolean;
	capabilities: readonly ProjectCapabilityValue[];
	participant: boolean;
}): ProjectRoleValue | null {
	if (input.manage) return 'manage';
	if (!input.participant) return null;
	return input.capabilities.includes('COORDINATE') ? 'coordinate' : 'participate';
}

export const PROJECT_ROLE_LABELS: Record<ProjectRoleValue, string> = {
	manage: 'Je gère',
	coordinate: 'Je coordonne',
	participate: 'Je participe'
};

export type InviteRefusal = 'capabilities' | 'minorCapability' | 'minorOwner' | null;

/**
 * Qui peut proposer quoi dans une invitation (§6.2, I11) : la gestion
 * propose une participation simple ou la coordination ; la coordination
 * invite seulement des participant·es simples. Un·e mineur·e n'est
 * invité·e qu'à un projet d'un groupe dont elle ou il est membre, jamais
 * pour coordonner.
 */
export function inviteRefusal(input: {
	manage: boolean;
	capabilities: readonly ProjectCapabilityValue[];
	minor: boolean;
	minorIsMemberOfOwnerBand: boolean;
}): InviteRefusal {
	if (input.capabilities.length > 0 && !input.manage) return 'capabilities';
	if (input.minor && input.capabilities.length > 0) return 'minorCapability';
	if (input.minor && !input.minorIsMemberOfOwnerBand) return 'minorOwner';
	return null;
}

/** Un refus récent du même projet : pas de nouvelle invitation avant le délai. */
export function declinedRecently(answeredAt: Date | null, now: Date): boolean {
	if (!answeredAt) return false;
	return now.getTime() - answeredAt.getTime() < REINVITE_AFTER_DECLINE_DAYS * 86_400_000;
}

/** Capacités à proposer en plus de celles déjà en vigueur ou proposées. */
export function capabilitiesToPropose(
	wanted: readonly ProjectCapabilityValue[],
	current: readonly ProjectCapabilityValue[],
	proposed: readonly ProjectCapabilityValue[]
): ProjectCapabilityValue[] {
	return [...new Set(wanted)].filter((c) => !current.includes(c) && !proposed.includes(c));
}
