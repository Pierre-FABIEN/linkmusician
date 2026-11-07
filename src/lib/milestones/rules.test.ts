import { describe, expect, it } from 'vitest';
import {
	DECLARABLE_KEYS,
	MILESTONE_CATALOG,
	MILESTONE_KEYS,
	compositionProof,
	creditDate,
	dayToDate,
	declareBlocker,
	declareSchema,
	isUpgrade,
	membersAt,
	todayInParis
} from './rules';

describe('catalogue des étapes (D41)', () => {
	it('suit l’ordre du brief, une entrée par étape', () => {
		expect(MILESTONE_CATALOG.map((d) => d.key)).toEqual([...MILESTONE_KEYS]);
		expect(MILESTONE_CATALOG.map((d) => d.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
	});

	it('ouvre les étapes 1 à 6 au lancement, en déclare quatre', () => {
		const open = MILESTONE_CATALOG.filter((d) => d.mode !== 'later').map((d) => d.ordinal);
		expect(open).toEqual([1, 2, 3, 4, 5, 6]);
		expect(DECLARABLE_KEYS).toEqual([
			'FIRST_REHEARSAL',
			'FIRST_RECORDING',
			'FIRST_PUBLIC_DEMO',
			'FIRST_GIG'
		]);
	});
});

describe('niveaux de preuve', () => {
	it('ne fait que monter', () => {
		expect(isUpgrade(null, 'DECLARED')).toBe(true);
		expect(isUpgrade('DECLARED', 'CORROBORATED')).toBe(true);
		expect(isUpgrade('CORROBORATED', 'CORROBORATED')).toBe(false);
		expect(isUpgrade('VERIFIED', 'CORROBORATED')).toBe(false);
	});

	it('« Première composition » suit le meilleur morceau composé', () => {
		expect(compositionProof([])).toBeNull();
		expect(compositionProof([{ proof: 'DECLARED' }])).toBe('DECLARED');
		expect(compositionProof([{ proof: 'DECLARED' }, { proof: 'CORROBORATED' }])).toBe(
			'CORROBORATED'
		);
	});
});

describe('membres présents à la date de l’étape', () => {
	const formedAt = new Date('2026-10-01T00:00:00Z');
	const periods = [
		{ personId: 'a', startedAt: new Date('2026-09-01'), endedAt: null },
		{ personId: 'b', startedAt: new Date('2026-10-01'), endedAt: new Date('2026-11-01') },
		{ personId: 'c', startedAt: new Date('2026-11-01'), endedAt: null },
		{ personId: 'd', startedAt: null, endedAt: null }
	];

	it('une étape d’avant la plateforme revient à l’effectif de la formation', () => {
		const at = creditDate(new Date('2019-05-01'), formedAt);
		expect(at).toEqual(formedAt);
		expect(membersAt(periods, at).sort()).toEqual(['a', 'b']);
	});

	it('un départ ou une arrivée après la date ne compte pas', () => {
		expect(membersAt(periods, new Date('2026-11-01')).sort()).toEqual(['a', 'c']);
		expect(membersAt(periods, new Date('2026-10-15')).sort()).toEqual(['a', 'b']);
	});
});

describe('déclarer une étape', () => {
	const ok = { key: 'FIRST_GIG' as const, formed: true, dissolved: false, already: false };

	it('se fait pour un groupe formé, une fois', () => {
		expect(declareBlocker(ok)).toBeNull();
		expect(declareBlocker({ ...ok, formed: false })).toMatch(/formé/);
		expect(declareBlocker({ ...ok, already: true })).toMatch(/déjà/);
		expect(declareBlocker({ ...ok, dissolved: true })).toMatch(/dissous/);
	});

	it('refuse les étapes automatiques et celles d’après le lancement', () => {
		expect(declareBlocker({ ...ok, key: 'FORMATION' })).not.toBeNull();
		expect(declareBlocker({ ...ok, key: 'FIRST_COMPOSITION' })).not.toBeNull();
		expect(declareBlocker({ ...ok, key: 'FIRST_TOUR' })).not.toBeNull();
	});
});

describe('formulaire de déclaration', () => {
	const now = new Date('2026-11-07T10:00:00Z');
	const schema = declareSchema(now);

	it('accepte une date passée et une précision courte', () => {
		const parsed = schema.parse({ key: 'FIRST_GIG', day: '2026-03-12', note: '  Au  Bikini ' });
		expect(parsed).toEqual({ key: 'FIRST_GIG', day: '2026-03-12', note: 'Au Bikini' });
		expect(schema.parse({ key: 'FIRST_GIG', day: '2026-11-07' }).note).toBeNull();
	});

	it('refuse une date future, impossible ou trop ancienne', () => {
		expect(schema.safeParse({ key: 'FIRST_GIG', day: '2026-11-08' }).success).toBe(false);
		expect(schema.safeParse({ key: 'FIRST_GIG', day: '2026-02-30' }).success).toBe(false);
		expect(schema.safeParse({ key: 'FIRST_GIG', day: '1949-12-31' }).success).toBe(false);
		expect(schema.safeParse({ key: 'FIRST_GIG', day: '' }).success).toBe(false);
	});

	it('refuse une précision trop longue', () => {
		expect(
			schema.safeParse({ key: 'FIRST_GIG', day: '2026-01-01', note: 'x'.repeat(81) }).success
		).toBe(false);
	});

	it('date du jour à Paris, stockée à midi UTC', () => {
		expect(todayInParis(new Date('2026-11-07T23:30:00Z'))).toBe('2026-11-08');
		expect(dayToDate('2026-03-12').toISOString()).toBe('2026-03-12T12:00:00.000Z');
	});
});
