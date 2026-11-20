import { describe, expect, it } from 'vitest';
import { appreciateBadge, crossedStatus, type CrossedJam } from './afterJam';

const now = new Date('2026-11-08T21:00:00Z');
const jam = (patch: Partial<CrossedJam>): CrossedJam => ({
	startsAt: new Date('2026-11-05T19:00:00Z'),
	endsAt: new Date('2026-11-05T23:00:00Z'),
	attended: true,
	others: 3,
	given: 1,
	...patch
});

describe('crossedStatus', () => {
	it.each([
		['à apprécier', {}, false, 2, '2 musicien·nes à apprécier'],
		['tout le monde', { given: 3 }, false, 0, 'Tu as apprécié tout le monde'],
		['pas « J’y étais »', { attended: false }, false, 2, 'Tu y étais ? Dis-le, pour toi seul·e'],
		['privé (D81)', { others: 0, given: 0 }, false, 0, 'Tu y étais · présence privée'],
		[
			'en cours',
			{ startsAt: new Date('2026-11-08T20:00:00Z'), endsAt: new Date('2026-11-08T23:00:00Z') },
			true,
			2,
			'2 musicien·nes à apprécier'
		]
	])('%s', (_, patch, live, left, label) => {
		expect(crossedStatus(jam(patch), now)).toEqual({ live, left, label });
	});
});

describe('appreciateBadge', () => {
	it('la jam en cours passe d’abord', () => {
		const live = jam({
			startsAt: new Date('2026-11-08T20:00:00Z'),
			endsAt: new Date('2026-11-08T23:00:00Z')
		});
		expect(appreciateBadge([jam({}), live], now)).toBe('Jam en cours');
	});
	it('sinon le total à apprécier, jams où l’on était', () => {
		expect(appreciateBadge([jam({}), jam({ given: 0 }), jam({ attended: false })], now)).toBe(
			'5 à apprécier'
		);
	});
	it('rien à faire : pas de badge', () => {
		expect(appreciateBadge([jam({ given: 3 })], now)).toBeNull();
		expect(appreciateBadge([], now)).toBeNull();
	});
});
