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
	private endorsements: { actorId: string; endorserId: string; at: Date }[] = [];
	/** Crédits de morceaux : qui a reçu sa part, et avec qui (D35). */
	private workCredits: { workId: string; personId: string; withIds: string[]; at: Date }[] = [];
	/** Concerts tenus : qui organisait ou bookait, avec quel artiste (P5-01). */
	private gigs: { promoterId: string; performerId: string; venueOrgId?: string; at: Date }[] = [];
	private managements: { managerId: string; artistId: string; at: Date }[] = [];
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
			priorEndorsements: (actorId, endorserId, since) =>
				this.endorsements.filter(
					(e) => e.actorId === actorId && e.endorserId === endorserId && e.at >= since
				).length,
			priorCoWorks: (a, b, since, workId) =>
				new Set(
					this.workCredits
						.filter(
							(w) =>
								w.workId !== workId &&
								w.at >= since &&
								[w.personId, ...w.withIds].includes(a) &&
								[w.personId, ...w.withIds].includes(b)
						)
						.map((w) => w.workId)
				).size,
			creditedOnWork: (personId, workId) =>
				this.workCredits.some((w) => w.workId === workId && w.personId === personId),
			priorGigs: (promoterId, performerId, since, venueOrgId) =>
				this.gigs.filter(
					(g) =>
						g.promoterId === promoterId &&
						g.performerId === performerId &&
						g.at >= since &&
						(!venueOrgId || g.venueOrgId === venueOrgId)
				).length,
			priorManagements: (managerId, artistId, since) =>
				this.managements.filter(
					(m) => m.managerId === managerId && m.artistId === artistId && m.at >= since
				).length,
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
			this.endorsements.push({
				actorId: event.actorId,
				endorserId: event.endorserId,
				at: event.occurredAt
			});
		}
		if (event.type === 'work.composed') {
			const ids = [...new Set(event.contributorIds)];
			for (const personId of ids)
				this.workCredits.push({
					workId: event.workId,
					personId,
					withIds: ids.filter((id) => id !== personId),
					at: event.occurredAt
				});
		}
		if (event.type === 'work.credit_confirmed') {
			this.workCredits.push({
				workId: event.workId,
				personId: event.personId,
				withIds: event.otherIds,
				at: event.occurredAt
			});
		}
		if (event.type === 'gig.held') {
			for (const promoterId of new Set([...event.organizerIds, ...event.bookerIds]))
				for (const performerId of new Set(event.performerIds))
					this.gigs.push({
						promoterId,
						performerId,
						venueOrgId: event.venueOrgId,
						at: event.occurredAt
					});
		}
		if (event.type === 'management.confirmed') {
			this.managements.push({
				managerId: event.managerId,
				artistId: event.artistId,
				at: event.occurredAt
			});
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
		return levelFromXp(this.xp(actorId));
	}
}
