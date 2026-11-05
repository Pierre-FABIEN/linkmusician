import { describe, expect, it } from 'vitest';
import { displayStatus, expiresAtFor, isActive, opportunitySchema, unmetConditions } from './rules';

const now = new Date('2026-11-05T12:00:00Z');
const valid = {
	kind: 'JAM',
	title: 'Jam funk jeudi soir',
	description: 'On cherche une basse et une voix pour une jam funk détendue.',
	instrument: '',
	minLevel: '',
	genre: 'funk',
	minTier: '',
	radiusKm: '25',
	durationDays: '14',
	slots: '2',
	startsAt: ''
};

describe('formulaire d’annonce (P2-02)', () => {
	it('accepte une annonce valide, champs facultatifs vides', () => {
		const r = opportunitySchema.safeParse(valid);
		expect(r.success).toBe(true);
		expect(r.data).toMatchObject({ kind: 'JAM', genre: 'funk', instrument: undefined, slots: 2 });
	});

	it.each([
		[{ kind: 'CONCERT' }, 'kind'],
		[{ title: 'Jam' }, 'title'],
		[{ description: 'trop court' }, 'description'],
		[{ radiusKm: '7' }, 'radiusKm'],
		[{ durationDays: '60' }, 'durationDays'],
		[{ slots: '0' }, 'slots'],
		[{ instrument: "bat'; drop" }, 'instrument']
	])('refuse %o', (patch, field) => {
		const r = opportunitySchema.safeParse({ ...valid, ...patch });
		expect(r.success).toBe(false);
		expect(r.error?.issues.map((i) => i.path[0])).toContain(field);
	});
});

describe('cycle de vie', () => {
	it('expire après la durée, ou le lendemain de l’événement s’il est plus tôt', () => {
		expect(expiresAtFor(14, now).toISOString()).toBe('2026-11-19T12:00:00.000Z');
		expect(expiresAtFor(14, now, new Date('2026-11-08T00:00:00Z')).toISOString()).toBe(
			'2026-11-09T00:00:00.000Z'
		);
	});

	it('active : ouverte et pas échue ; échue = expirée à l’affichage', () => {
		const future = new Date('2026-11-06T00:00:00Z');
		const past = new Date('2026-11-04T00:00:00Z');
		expect(isActive({ status: 'OPEN', expiresAt: future }, now)).toBe(true);
		expect(isActive({ status: 'OPEN', expiresAt: past }, now)).toBe(false);
		expect(isActive({ status: 'CLOSED', expiresAt: future }, now)).toBe(false);
		expect(displayStatus({ status: 'OPEN', expiresAt: past }, now)).toBe('EXPIRED');
		expect(displayStatus({ status: 'FILLED', expiresAt: past }, now)).toBe('FILLED');
	});
});

describe('éligibilité (pour P2-03)', () => {
	const facts = {
		instruments: [{ slug: 'batterie', level: 3 }],
		genreSlugs: ['funk', 'soul-funk'],
		tiers: ['FIRST_STEPS']
	};
	it.each([
		[{}, []],
		[{ instrument: 'batterie', minLevel: 3 }, []],
		[{ instrument: 'batterie', minLevel: 4 }, ['level']],
		[{ instrument: 'basse' }, ['instrument']],
		[{ minLevel: 4 }, ['level']],
		[{ genre: 'soul-funk' }, []],
		[{ genre: 'metal' }, ['genre']],
		[{ minTier: 'NETWORKED' }, ['tier']]
	])('%o → %o', (condition, unmet) => {
		expect(unmetConditions(condition, facts)).toEqual(unmet);
	});
});
