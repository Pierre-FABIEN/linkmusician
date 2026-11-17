/**
 * Droit de candidater pour autrui (DASH-07a, D71, conception 18). Module pur,
 * partagé par le serveur et le navigateur.
 *
 * Un droit nouveau, distinct du mandat : l'agent titulaire d'un mandat
 * confirmé le demande, l'artiste (ou la gestion majeure du groupe) l'accorde.
 * Fin obligatoire, au plus six mois, jamais au-delà du mandat. Le mandat seul
 * n'autorise jamais à candidater.
 */
import { z } from 'zod';
import type { AgentKindValue } from './rules';

/** Types d'annonces qu'un droit peut couvrir ; le recrutement d'un groupe est exclu. */
export const GRANT_KINDS = ['GIG_SLOT', 'JAM', 'SESSION_WORK'] as const;
export type GrantKind = (typeof GRANT_KINDS)[number];

export const GRANT_KIND_LABELS: Record<GrantKind, string> = {
	GIG_SLOT: 'Plateaux',
	JAM: 'Jams',
	SESSION_WORK: 'Sessions et prestations'
};

/** Durée maximale d'un droit, comptée depuis l'accord. */
export const MAX_GRANT_DAYS = 183;
const DAY = 86_400_000;

/**
 * Types possibles pour ce couple : un groupe candidate à des plateaux, une
 * personne à des jams et des sessions ; un booker n'a que les plateaux.
 */
export function grantableKinds(
	artistKind: 'PERSON' | 'BAND',
	agentKind: AgentKindValue
): GrantKind[] {
	const forArtist: GrantKind[] = artistKind === 'BAND' ? ['GIG_SLOT'] : ['JAM', 'SESSION_WORK'];
	return agentKind === 'BOOKER' ? forArtist.filter((k) => k === 'GIG_SLOT') : forArtist;
}

export const grantRequestSchema = z.object({
	representationId: z.string().min(1),
	kinds: z
		.array(z.enum(GRANT_KINDS))
		.min(1, 'Choisis au moins un type d’annonce.')
		.max(GRANT_KINDS.length),
	expiresOn: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Indique une date de fin.')
		.refine(
			(v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
			'Date invalide.'
		)
});
export type GrantRequest = z.infer<typeof grantRequestSchema>;

/** Fin exclusive (minuit UTC) valable à la date `now` pour un mandat de fin `mandateEnd`. */
export function grantEndProblem(
	expiresAt: Date,
	now: Date,
	mandateEnd: Date | null
): string | null {
	if (!Number.isFinite(expiresAt.getTime())) return 'Date invalide.';
	if (expiresAt <= now) return 'La fin doit être dans le futur.';
	if (expiresAt.getTime() - now.getTime() > MAX_GRANT_DAYS * DAY)
		return 'Six mois au plus : redemande un droit ensuite.';
	if (mandateEnd && expiresAt > mandateEnd)
		return 'La fin doit rester dans la durée de l’accompagnement.';
	return null;
}

export type GrantState = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'ENDED';

export type StoredGrant = {
	kinds: readonly string[];
	expiresAt: Date;
	grantedAt: Date | null;
	endedAt: Date | null;
};

/** État lu à la date, sans écriture : l'expiration ne laisse aucun acte. */
export function grantState(g: StoredGrant, now: Date): GrantState {
	if (g.endedAt) return 'ENDED';
	if (now >= g.expiresAt) return 'EXPIRED';
	return g.grantedAt ? 'ACTIVE' : 'PENDING';
}

/** Le droit, accordé et en cours, couvre-t-il ce type d'annonce ? Le mandat est relu à part. */
export function grantAllows(g: StoredGrant, kind: string, now: Date): boolean {
	return grantState(g, now) === 'ACTIVE' && (GRANT_KINDS as readonly string[]).includes(kind)
		? g.kinds.includes(kind)
		: false;
}

export const GRANT_STATE_LABELS: Record<GrantState, string> = {
	PENDING: 'Demande en attente',
	ACTIVE: 'Droit accordé',
	EXPIRED: 'Droit échu',
	ENDED: 'Droit terminé'
};

export const GRANT_ACT_KINDS = [
	'REQUESTED',
	'GRANTED',
	'DECLINED',
	'WITHDRAWN',
	'REVOKED',
	'USED'
] as const;
export type GrantActKind = (typeof GRANT_ACT_KINDS)[number];

export const GRANT_ACT_LABELS: Record<GrantActKind, string> = {
	REQUESTED: 'Droit demandé',
	GRANTED: 'Droit accordé',
	DECLINED: 'Demande refusée',
	WITHDRAWN: 'Demande retirée',
	REVOKED: 'Droit révoqué',
	USED: 'Candidature envoyée'
};
