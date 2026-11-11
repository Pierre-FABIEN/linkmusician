import { describe, expect, it } from 'vitest';
import { promoterSummary } from './promoterSummary';
import { promoterTier } from './tiers';
import type { DomainEvent } from './events';

const gig = (n: number, over: Partial<Extract<DomainEvent, { type: 'gig.held' }>> = {}) =>
	({
		id: `e${n}`,
		type: 'gig.held',
		occurredAt: new Date('2026-11-01T20:00:00Z'),
		gigId: `g${n}`,
		organizerIds: ['orga'],
		bookerIds: [],
		performerIds: [`band${n}`],
		confirmerIds: [`member${n}`],
		firstDateIds: [],
		verified: false,
		...over
	}) as DomainEvent;

describe('organisateur·rice : résumé et rang (P5-05a)', () => {
	it('rien avant le premier événement tenu', () => {
		const s = promoterSummary('orga', []);
		expect(s).toEqual({ events: 0, distinctArtists: 0, verifiedFestivals: 0, firstDates: 0 });
		expect(promoterTier(s).tier).toBeNull();
	});

	it('un événement confirmé par qui l’organise ne compte pas', () => {
		const s = promoterSummary('orga', [gig(1, { confirmerIds: ['orga'] })]);
		expect(s.events).toBe(0);
	});

	it('compte les événements, les artistes distincts et les premières dates', () => {
		const events = [1, 2, 3, 4, 5].map((n) =>
			gig(n, { performerIds: [`band${n % 2}`], firstDateIds: n === 1 ? ['band1'] : [] })
		);
		events.push(gig(1)); // même date, en double : comptée une fois
		const s = promoterSummary('orga', events);
		expect(s).toMatchObject({ events: 5, distinctArtists: 2, firstDates: 1 });
		expect(promoterTier(s).tier?.id).toBe('REGULAR');
	});

	it('un festival : un événement vérifié de 10 artistes au moins', () => {
		const ten = Array.from({ length: 10 }, (_, i) => `band${i}`);
		expect(
			promoterSummary('orga', [gig(1, { performerIds: ten, verified: false })]).verifiedFestivals
		).toBe(0);
		const s = promoterSummary('orga', [gig(1, { performerIds: ten, verified: true })]);
		expect(promoterTier(s).tier?.id).toBe('FESTIVAL');
	});

	it('les dates des autres ne comptent pas', () => {
		expect(promoterSummary('quelqu-un', [gig(1)]).events).toBe(0);
	});
});
