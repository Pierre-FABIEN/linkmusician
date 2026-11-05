import { describe, expect, it } from 'vitest';
import {
	computeIndicators,
	DAY_MS,
	parisDay,
	retainedAt30,
	weeklySignups,
	type PersonFacts
} from './indicators';

const now = new Date('2026-11-05T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY_MS);
const ALL = { conversations: true, collaborations: true };

function person(over: Partial<PersonFacts> = {}): PersonFacts {
	return {
		createdAt: daysAgo(100),
		onboardedAt: null,
		firstReciprocalAt: null,
		firstCollabOrBandAt: null,
		networked: false,
		activeDays: new Set(),
		reportedForSpam: false,
		...over
	};
}
const byId = (list: ReturnType<typeof computeIndicators>, id: string) =>
	list.find((i) => i.id === id)!;

describe('parisDay', () => {
	it('suit l’heure de Paris, pas UTC', () => {
		expect(parisDay(new Date('2026-11-04T23:30:00Z'))).toBe('2026-11-05');
		expect(parisDay(new Date('2026-07-01T21:59:00Z'))).toBe('2026-07-01');
		expect(parisDay(new Date('2026-07-01T22:00:00Z'))).toBe('2026-07-02');
	});
});

describe('rétention à 30 jours', () => {
	const createdAt = new Date('2026-09-01T10:00:00Z');
	it.each([
		['2026-09-30', false], // J+29
		['2026-10-01', true], // J+30
		['2026-10-07', true], // J+36
		['2026-10-08', false] // J+37
	])('venu le %s → %s', (day, expected) => {
		expect(retainedAt30(person({ createdAt, activeDays: new Set([day]) }))).toBe(expected);
	});
});

describe('indicateurs (05 §2)', () => {
	it('cohorte vide : rien à mesurer', () => {
		for (const i of computeIndicators([], now, ALL)) expect(i.status).toBe('empty');
	});

	it('fonctionnalité pas encore livrée : « na »', () => {
		const list = computeIndicators([person()], now, {
			conversations: false,
			collaborations: false
		});
		expect(byId(list, 'reciprocal14').status).toBe('na');
		expect(byId(list, 'collab60').status).toBe('na');
		expect(byId(list, 'retention30Networked').status).toBe('na');
		expect(byId(list, 'onboarding').status).not.toBe('na');
	});

	it('conversation réciproque : seulement dans les 14 jours, et avec assez de recul', () => {
		const list = computeIndicators(
			[
				person({ createdAt: daysAgo(30), firstReciprocalAt: daysAgo(20) }), // J+10 ✓
				person({ createdAt: daysAgo(30), firstReciprocalAt: daysAgo(5) }), // J+25 ✗
				person({ createdAt: daysAgo(5), firstReciprocalAt: daysAgo(4) }) // trop récent
			],
			now,
			ALL
		);
		const i = byId(list, 'reciprocal14');
		expect([i.numerator, i.denominator]).toEqual([1, 2]);
		expect(i.status).toBe('ok'); // 50 % ≥ 30 %
	});

	it('collaboration ou groupe dans les 60 jours', () => {
		const list = computeIndicators(
			[
				person({ createdAt: daysAgo(90), firstCollabOrBandAt: daysAgo(40) }), // J+50 ✓
				...Array.from({ length: 9 }, () => person({ createdAt: daysAgo(90) }))
			],
			now,
			ALL
		);
		expect(byId(list, 'collab60')).toMatchObject({ numerator: 1, denominator: 10, status: 'ok' });
	});

	it('spam : sous 2 % pour être au vert', () => {
		const people = Array.from({ length: 50 }, (_, k) => person({ reportedForSpam: k === 0 }));
		expect(byId(computeIndicators(people, now, ALL), 'spam').status).toBe('below');
		people.push(...Array.from({ length: 50 }, () => person()));
		expect(byId(computeIndicators(people, now, ALL), 'spam').status).toBe('ok');
	});

	it('rétention « En réseau » : seulement ceux qui ont franchi le palier', () => {
		const createdAt = daysAgo(60);
		const back = new Set([parisDay(new Date(createdAt.getTime() + 31 * DAY_MS))]);
		const list = computeIndicators(
			[
				person({ createdAt, networked: true, activeDays: back }),
				person({ createdAt, networked: true }),
				person({ createdAt, networked: false, activeDays: back })
			],
			now,
			ALL
		);
		expect(byId(list, 'retention30Networked')).toMatchObject({ numerator: 1, denominator: 2 });
		expect(byId(list, 'retention30')).toMatchObject({ numerator: 2, denominator: 3 });
	});

	it('onboarding terminé', () => {
		const list = computeIndicators(
			[person({ onboardedAt: daysAgo(1) }), person(), person({ onboardedAt: daysAgo(2) })],
			now,
			ALL
		);
		expect(byId(list, 'onboarding')).toMatchObject({ numerator: 2, denominator: 3 });
	});
});

describe('inscriptions par semaine', () => {
	it('compte par semaine (lundi), ignore ce qui précède', () => {
		// 05/11/2026 est un jeudi : la semaine courante commence le lundi 02/11.
		const weeks = weeklySignups(
			[
				new Date('2026-11-02T08:00:00Z'),
				new Date('2026-11-05T08:00:00Z'),
				new Date('2026-10-28T08:00:00Z'),
				new Date('2026-01-01T08:00:00Z')
			],
			now,
			3
		);
		expect(weeks).toEqual([
			{ weekOf: '2026-10-19', count: 0 },
			{ weekOf: '2026-10-26', count: 1 },
			{ weekOf: '2026-11-02', count: 2 }
		]);
	});
});
