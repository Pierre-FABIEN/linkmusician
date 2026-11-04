/**
 * Registre en mémoire : rejoue une suite d'événements avec les vraies règles.
 * Sert aux personas de calibrage et aux tests ; la production utilise le
 * registre en base (`../ledger.ts`), avec la même interface `RuleContext`.
 */
import { gainsFor } from './engine';
import { parseDomainEvent } from './events';
import { levelFromXp } from './levels';
import type { TrustLevel } from './trust';
import type { RuleContext, Track, XpGain } from './types';

type Recorded = XpGain & { at: Date; eventId: string };

export class MemoryLedger {
	readonly gains: Recorded[] = [];
	private collaborations: { a: string; b: string; at: Date }[] = [];
	private memberships: { personId: string; bandId: string }[] = [];
	private endorsements = new Set<string>();
	private now = new Date(0);

	constructor(private trust: Record<string, TrustLevel> = {}) {}

	setTrust(actorId: string, level: TrustLevel) {
		this.trust[actorId] = level;
	}

	context(): RuleContext {
		return {
			now: this.now,
			countGains: (actorId, ruleId, since) =>
				this.gains.filter(
					(g) => g.actorId === actorId && g.ruleId === ruleId && (!since || g.at >= since)
				).length,
			priorCollaborations: (a, b, since) =>
				this.collaborations.filter(
					(c) => ((c.a === a && c.b === b) || (c.a === b && c.b === a)) && c.at >= since
				).length,
			priorMemberships: (personId, bandId) =>
				this.memberships.filter((m) => m.personId === personId && m.bandId === bandId).length,
			hasEndorsement: (actorId, endorserId, skill) =>
				this.endorsements.has(`${actorId}|${endorserId}|${skill}`),
			trustLevel: (actorId) => this.trust[actorId] ?? 0
		};
	}

	/** Applique un événement et enregistre ses effets ; renvoie les gains. */
	apply(input: unknown): XpGain[] {
		const event = parseDomainEvent(input);
		this.now = event.occurredAt;
		const gains = gainsFor(event, this.context());
		for (const gain of gains) this.gains.push({ ...gain, at: event.occurredAt, eventId: event.id });
		// Faits métier connus après l'événement (l'état, écrit par les services).
		if (event.type === 'collaboration.completed') {
			const ids = [...new Set(event.participantIds)];
			for (let i = 0; i < ids.length; i++)
				for (let j = i + 1; j < ids.length; j++)
					this.collaborations.push({ a: ids[i], b: ids[j], at: event.occurredAt });
		}
		if (event.type === 'membership.accepted') {
			this.memberships.push({ personId: event.personId, bandId: event.bandId });
		}
		if (event.type === 'endorsement.received') {
			this.endorsements.add(`${event.actorId}|${event.endorserId}|${event.skill}`);
		}
		return gains;
	}

	xp(actorId: string, track?: Track): number {
		return this.gains
			.filter((g) => g.actorId === actorId && (!track || g.track === track))
			.reduce((sum, g) => sum + g.amount, 0);
	}

	/** Niveau de compte : somme de toutes les pistes de la personne (§3). */
	level(actorId: string): number {
		return levelFromXp(this.xp(actorId, 'MUSICIAN'));
	}
}
