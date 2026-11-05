import { describe, expect, it } from 'vitest';
import { endorseRefusal, endorseSchema, initials, isAfterJamOpen } from './afterJam';

const jam = {
	startsAt: new Date('2026-11-12T19:00:00Z'),
	endsAt: new Date('2026-11-12T22:00:00Z')
};
const ok = {
	now: new Date('2026-11-13T10:00:00Z'),
	jam,
	fromId: 'lea',
	toId: 'malik',
	fromPresent: true,
	toPresent: true,
	fromCanEndorse: true,
	alreadyEndorsed: false
};

describe('après la jam (P2-15, D27)', () => {
	it('« J’y étais » : du début de la jam à 7 jours après sa fin', () => {
		expect(isAfterJamOpen(jam, new Date('2026-11-12T18:59:00Z'))).toBe(false);
		expect(isAfterJamOpen(jam, new Date('2026-11-12T19:00:00Z'))).toBe(true);
		expect(isAfterJamOpen(jam, new Date('2026-11-19T22:00:00Z'))).toBe(true);
		expect(isAfterJamOpen(jam, new Date('2026-11-19T22:01:00Z'))).toBe(false);
	});

	it('appréciation impossible sans présence commune', () => {
		expect(endorseRefusal(ok)).toBeNull();
		expect(endorseRefusal({ ...ok, fromPresent: false })).toMatch(/tu y étais/);
		expect(endorseRefusal({ ...ok, toPresent: false })).toMatch(/n’a pas dit/);
	});

	it('ni soi-même, ni deux fois, ni sans TL1, ni hors délai', () => {
		expect(endorseRefusal({ ...ok, toId: 'lea' })).toMatch(/toi-même/);
		expect(endorseRefusal({ ...ok, alreadyEndorsed: true })).toMatch(/déjà/);
		expect(endorseRefusal({ ...ok, fromCanEndorse: false })).toMatch(/palier de confiance 1/);
		expect(endorseRefusal({ ...ok, now: new Date('2026-11-25T10:00:00Z') })).toMatch(/7 jours/);
		expect(endorseRefusal({ ...ok, now: new Date('2026-11-12T18:00:00Z') })).toMatch(
			/pas encore commencé/
		);
	});

	it('une qualité ou un instrument, pas les deux', () => {
		expect(endorseSchema.safeParse({ to: 'malik-drums', quality: 'GROOVE' }).success).toBe(true);
		expect(endorseSchema.safeParse({ to: 'malik-drums', instrument: 'batterie' }).success).toBe(
			true
		);
		expect(
			endorseSchema.safeParse({ to: 'malik-drums', quality: 'GROOVE', instrument: 'batterie' })
				.success
		).toBe(false);
		expect(endorseSchema.safeParse({ to: 'malik-drums' }).success).toBe(false);
	});

	it('initiales', () => {
		expect(initials('Léa Martin')).toBe('LM');
		expect(initials('malik')).toBe('M');
		expect(initials('  ')).toBe('?');
	});
});
