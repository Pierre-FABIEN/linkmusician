import { describe, expect, it } from 'vitest';
import { achievementsFor } from './achievements';
import { gainsFor } from './engine';
import { parseDomainEvent } from './events';
import type { RuleContext } from './types';

const at = new Date('2026-11-13T10:00:00Z');
const ctx: RuleContext = {
	now: at,
	countGains: () => 0,
	priorCollaborations: () => 0,
	priorMemberships: () => 0,
	priorEndorsements: () => 0,
	trustLevel: () => 1
};
const attended = (over: Record<string, unknown> = {}) =>
	parseDomainEvent({
		id: 'e1',
		occurredAt: at,
		type: 'jam.attended',
		actorId: 'lea',
		jamId: 'jam',
		lateNight: false,
		distinctInstruments: 1,
		ledFullLineup: false,
		...over
	});
const ids = (event: ReturnType<typeof parseDomainEvent>) =>
	achievementsFor(event, gainsFor(event, ctx)).map((a) => `${a.actorId}:${a.achievementId}`);

describe('succès fun des jams (P2-15b)', () => {
	it('« J’y étais » ne rapporte aucune XP (D27)', () => {
		expect(gainsFor(attended({ lateNight: true, ledFullLineup: true }), ctx)).toEqual([]);
	});

	it('Noctambule, Touche-à-tout, Chef d’orchestre', () => {
		expect(ids(attended())).toEqual([]);
		expect(ids(attended({ lateNight: true }))).toEqual(['lea:jam-night-owl']);
		expect(ids(attended({ distinctInstruments: 3 }))).toEqual(['lea:jam-all-rounder']);
		expect(ids(attended({ ledFullLineup: true }))).toEqual(['lea:jam-conductor']);
	});

	it('Brise-glace : pour qui apprécie, après une jam', () => {
		const endorsement = (jamId?: string) =>
			parseDomainEvent({
				id: 'e2',
				occurredAt: at,
				type: 'endorsement.received',
				actorId: 'malik',
				endorserId: 'lea',
				skill: 'bon groove',
				...(jamId ? { jamId } : {})
			});
		expect(ids(endorsement('jam'))).toContain('lea:jam-icebreaker');
		expect(ids(endorsement())).not.toContain('lea:jam-icebreaker');
	});
});
