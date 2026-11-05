/**
 * Types communs au noyau de progression.
 */
import type { DomainEventType, EventOf } from './events';
import type { TrustLevel } from './trust';

/** Piste qui reçoit l'XP. Les autres métiers arriveront avec leurs phases. */
export type Track = 'MUSICIAN' | 'BAND';

/** Gain calculé par une règle, avant inscription au registre. */
export type XpGain = {
	actorId: string;
	track: Track;
	/** Entier, jamais nul (une règle ne renvoie pas de gain à 0). */
	amount: number;
	/** Produit des multiplicateurs appliqués (1 sans multiplicateur). */
	multiplier: number;
	ruleId: string;
	ruleVersion: number;
	/** Lisible par la personne (« Collaboration confirmée ×0,5 »). */
	reason: string;
};

/**
 * Ce qu'une règle peut savoir de l'historique. Les fonctions sont fournies par
 * l'appelant (base de données en production, mémoire dans les tests) et
 * doivent être déterministes pour un même état.
 */
export interface RuleContext {
	now: Date;
	/** Gains déjà inscrits pour (acteur, règle), depuis `since` si fourni. */
	countGains(actorId: string, ruleId: string, since?: Date): number;
	/** Collaborations confirmées entre deux personnes depuis `since`, celle en cours exclue. */
	priorCollaborations(a: string, b: string, since: Date): number;
	/** Adhésions acceptées antérieures de la personne à ce groupe. */
	priorMemberships(personId: string, bandId: string): number;
	/**
	 * Appréciations (endossements) déjà reçues de cet endosseur depuis
	 * `since`, celle en cours exclue (rendements décroissants par paire, D27).
	 */
	priorEndorsements(actorId: string, endorserId: string, since: Date): number;
	trustLevel(actorId: string): TrustLevel;
}

export type Rule<T extends DomainEventType = DomainEventType> = {
	id: string;
	version: number;
	on: T;
	apply(event: EventOf<T>, ctx: RuleContext): XpGain[];
};

/** Aide à la déclaration d'une règle, avec typage de l'événement. */
export function defineRule<T extends DomainEventType>(rule: Rule<T>): Rule<T> {
	return rule;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBefore(date: Date, days: number): Date {
	return new Date(date.getTime() - days * DAY_MS);
}
