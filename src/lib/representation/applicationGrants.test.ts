import { describe, expect, it } from 'vitest';
import {
	grantAllows,
	grantEndProblem,
	grantRequestSchema,
	grantState,
	grantableKinds,
	MAX_GRANT_DAYS
} from './applicationGrants';

const now = new Date('2026-11-17T10:00:00Z');
const day = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe('grantableKinds', () => {
	it('un groupe ne couvre que les plateaux', () => {
		expect(grantableKinds('BAND', 'MANAGER')).toEqual(['GIG_SLOT']);
		expect(grantableKinds('BAND', 'BOOKER')).toEqual(['GIG_SLOT']);
	});
	it('une personne : jams et sessions avec un manager, rien avec un booker', () => {
		expect(grantableKinds('PERSON', 'MANAGER')).toEqual(['JAM', 'SESSION_WORK']);
		expect(grantableKinds('PERSON', 'BOOKER')).toEqual([]);
	});
	it('le recrutement d’un groupe n’est jamais couvert', () => {
		expect(
			grantRequestSchema.safeParse({
				representationId: 'r',
				kinds: ['RECRUIT_MEMBER'],
				expiresOn: '2027-01-01'
			}).success
		).toBe(false);
	});
});

describe('grantEndProblem', () => {
	it('fin future, six mois au plus, dans le mandat', () => {
		expect(grantEndProblem(day(30), now, null)).toBeNull();
		expect(grantEndProblem(now, now, null)).toMatch(/futur/);
		expect(grantEndProblem(day(MAX_GRANT_DAYS + 1), now, null)).toMatch(/Six mois/);
		expect(grantEndProblem(day(30), now, day(10))).toMatch(/accompagnement/);
		expect(grantEndProblem(day(10), now, day(10))).toBeNull();
		expect(grantEndProblem(new Date('x'), now, null)).toMatch(/invalide/);
	});
	it('refuse une date mal formée', () => {
		expect(
			grantRequestSchema.safeParse({
				representationId: 'r',
				kinds: ['JAM'],
				expiresOn: '2027-02-30'
			}).success
		).toBe(false);
		expect(
			grantRequestSchema.safeParse({ representationId: 'r', kinds: [], expiresOn: '2027-02-01' })
				.success
		).toBe(false);
	});
});

describe('grantState et grantAllows', () => {
	const base = { kinds: ['GIG_SLOT'], expiresAt: day(30), grantedAt: null, endedAt: null };
	it('rien avant l’accord', () => {
		expect(grantState(base, now)).toBe('PENDING');
		expect(grantAllows(base, 'GIG_SLOT', now)).toBe(false);
	});
	it('accordé : seulement les types cochés', () => {
		const g = { ...base, grantedAt: now };
		expect(grantState(g, now)).toBe('ACTIVE');
		expect(grantAllows(g, 'GIG_SLOT', now)).toBe(true);
		expect(grantAllows(g, 'JAM', now)).toBe(false);
		expect(grantAllows({ ...g, kinds: ['RECRUIT_MEMBER'] }, 'RECRUIT_MEMBER', now)).toBe(false);
	});
	it('échu à la date de fin exclue, terminé après révocation', () => {
		const g = { ...base, grantedAt: now };
		expect(grantState(g, day(30))).toBe('EXPIRED');
		expect(grantAllows(g, 'GIG_SLOT', day(30))).toBe(false);
		expect(grantState({ ...g, endedAt: now }, now)).toBe('ENDED');
		expect(grantAllows({ ...g, endedAt: now }, 'GIG_SLOT', now)).toBe(false);
	});
});
