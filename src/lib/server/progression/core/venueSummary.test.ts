import { describe, expect, it } from 'vitest';
import { venueSummary } from './venueSummary';
import { venueTier } from './tiers';
import type { DomainEvent } from './events';

const gig = (n: number, over: Partial<Extract<DomainEvent, { type: 'gig.held' }>> = {}) =>
	({
		id: `e${n}`,
		type: 'gig.held',
		occurredAt: new Date('2026-11-01T20:00:00Z'),
		gigId: `g${n}`,
		organizerIds: ['patron'],
		bookerIds: [],
		performerIds: [`band${n}`],
		confirmerIds: [`member${n}`],
		firstDateIds: [],
		venueOrgId: 'bar',
		verified: false,
		...over
	}) as DomainEvent;

describe('lieu : résumé et rang (P5-03b)', () => {
	it('fiche publiée : Lieu ouvert, sans date', () => {
		const s = venueSummary('bar', true, []);
		expect(venueTier(s).tier?.id).toBe('VENUE_OPEN');
		expect(venueTier(venueSummary('bar', false, [])).tier).toBeNull();
	});

	it('trois dates confirmées : Scène ouverte ; celles d’un autre lieu ne comptent pas', () => {
		const events = [1, 2, 3].map((n) => gig(n));
		events.push(gig(4, { venueOrgId: 'autre' }));
		const s = venueSummary('bar', true, events);
		expect(s).toMatchObject({ dates: 3, distinctArtists: 3 });
		expect(venueTier(s).tier?.id).toBe('OPEN_STAGE');
	});

	it('une date confirmée par qui l’organise ne compte pas ; une première date se compte', () => {
		const s = venueSummary('bar', true, [
			gig(1, { confirmerIds: ['patron'] }),
			gig(2, { firstDateIds: ['band2'] })
		]);
		expect(s).toMatchObject({ dates: 1, firstDates: 1 });
	});

	it('une jam publique tenue compte comme une date, dès 3 présent·es hors organisation', () => {
		const jam = (n: number, confirmerIds: string[]) =>
			({
				id: `j${n}`,
				type: 'jam.held',
				occurredAt: new Date('2026-11-05T22:00:00Z'),
				jamId: `jam${n}`,
				organizerIds: ['patron'],
				confirmerIds,
				venueOrgId: 'bar'
			}) as DomainEvent;
		const s = venueSummary('bar', true, [
			gig(1),
			jam(1, ['a', 'b', 'c']),
			jam(1, ['a', 'b', 'c']),
			jam(2, ['a', 'b', 'patron']),
			jam(3, ['a', 'b', 'c', 'd'])
		]);
		expect(s.dates).toBe(3);
		expect(s.distinctArtists).toBe(1);
		expect(venueTier(s).tier?.id).toBe('OPEN_STAGE');
	});

	it('une jam invalidée par la modération ne compte plus (#93)', () => {
		const held = {
			id: 'j1',
			type: 'jam.held',
			occurredAt: new Date('2026-11-05T22:00:00Z'),
			jamId: 'jam1',
			organizerIds: ['patron'],
			confirmerIds: ['a', 'b', 'c'],
			venueOrgId: 'bar'
		} as DomainEvent;
		const invalidated = {
			id: 'i1',
			type: 'jam.invalidated',
			occurredAt: new Date('2026-11-07T10:00:00Z'),
			jamId: 'jam1',
			organizerIds: ['patron'],
			venueOrgId: 'bar'
		} as DomainEvent;
		expect(venueSummary('bar', true, [held]).dates).toBe(1);
		expect(venueSummary('bar', true, [held, invalidated]).dates).toBe(0);
	});
});
