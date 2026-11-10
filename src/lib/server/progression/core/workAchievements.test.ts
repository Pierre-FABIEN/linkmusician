import { describe, expect, it } from 'vitest';
import { achievementsFor } from './achievements';
import { gainsFor } from './engine';
import { parseDomainEvent } from './events';
import type { RuleContext } from './types';

/**
 * Succès des crédits du son et de qui compose seul·e (P4-07b) : des badges,
 * jamais d'XP.
 */
const at = new Date('2026-11-10T18:00:00Z');
const ctx: RuleContext = {
	now: at,
	countGains: () => 0,
	priorCollaborations: () => 0,
	priorMemberships: () => 0,
	priorEndorsements: () => 0,
	priorCoWorks: () => 0,
	creditedOnWork: () => false,
	trustLevel: () => 1
};
const event = (payload: Record<string, unknown>) =>
	parseDomainEvent({ id: 'e1', occurredAt: at, workId: 'w1', personId: 'sam', ...payload });
const unlocked = (e: ReturnType<typeof parseDomainEvent>) =>
	achievementsFor(e, gainsFor(e, ctx)).map((a) => a.achievementId);

describe('succès des crédits du son et du morceau fait seul·e (P4-07b)', () => {
	it('un crédit du son : un succès par rôle, sans XP', () => {
		const e = event({
			type: 'work.sound_credited',
			kinds: ['RECORDING', 'MIXING'],
			ownWork: false,
			ownSoloWork: false
		});
		expect(gainsFor(e, ctx)).toEqual([]);
		expect(unlocked(e).sort()).toEqual(['first-mixing-credit', 'first-recording-credit']);
	});

	it('composé seul·e : « Fait maison », sans XP', () => {
		const e = event({ type: 'work.composed_solo', withSoundRole: false });
		expect(gainsFor(e, ctx)).toEqual([]);
		expect(unlocked(e)).toEqual(['home-made']);
	});

	it('« Orchestre à soi seul·e » : composé seul·e et un rôle du son, dans un ordre ou l’autre', () => {
		expect(unlocked(event({ type: 'work.composed_solo', withSoundRole: true })).sort()).toEqual([
			'home-made',
			'one-person-band'
		]);
		expect(
			unlocked(
				event({ type: 'work.sound_credited', kinds: ['MIXING'], ownWork: true, ownSoloWork: true })
			)
		).toEqual(['one-person-band']);
	});

	it('se créditer soi-même sur son morceau ne débloque pas de succès de rôle', () => {
		expect(
			unlocked(
				event({ type: 'work.sound_credited', kinds: ['MIXING'], ownWork: true, ownSoloWork: false })
			)
		).toEqual([]);
	});
});
