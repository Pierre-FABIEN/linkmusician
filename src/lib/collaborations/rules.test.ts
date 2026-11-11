import { describe, expect, it } from 'vitest';
import {
	checkGigParties,
	collabStatus,
	collaborationSchema,
	hasHappened,
	nextStep,
	shiftDay,
	checkProvider,
	KIND_WORK_STAGE,
	WORK_STAGES
} from './rules';

const yes = { accepted: true, confirmed: true };
const accepted = { accepted: true, confirmed: false };
const none = { accepted: false, confirmed: false };

describe('collaborations (P2-06)', () => {
	it('concert (P5-06) : un groupe et un hôte, et seulement pour un concert', () => {
		expect(checkGigParties('GIG', {})).toMatch(/groupe/);
		expect(checkGigParties('GIG', { band: 'les-rats' })).toMatch(/lieu/);
		expect(checkGigParties('GIG', { band: 'les-rats', host: 'le-comptoir' })).toBeNull();
		expect(checkGigParties('REHEARSAL', { band: 'les-rats' })).toMatch(/Seul un concert/);
		expect(checkGigParties('REHEARSAL', {})).toBeNull();
	});

	it('dates : fenêtre autour d’aujourd’hui', () => {
		const schema = collaborationSchema('2026-11-05');
		const ok = (happenedOn: string) =>
			schema.safeParse({ kind: 'REHEARSAL', title: 'Répète du jeudi', happenedOn }).success;
		expect(ok('2026-11-05')).toBe(true);
		expect(ok(shiftDay('2026-11-05', -60))).toBe(true);
		expect(ok(shiftDay('2026-11-05', -61))).toBe(false);
		expect(ok(shiftDay('2026-11-05', 91))).toBe(false);
		// Le concert est proposable depuis P5-06, avec son groupe et son hôte.
		expect(
			schema.safeParse({ kind: 'GIG', title: 'Concert', happenedOn: '2026-11-05' }).success
		).toBe(true);
		// Une jam n'est plus une collaboration (D27).
		expect(
			schema.safeParse({ kind: 'JAM', title: 'Jam du jeudi', happenedOn: '2026-11-05' }).success
		).toBe(false);
	});

	it('a eu lieu : jour civil à Paris', () => {
		expect(hasHappened('2026-11-05', new Date('2026-11-04T23:30:00Z'))).toBe(true); // déjà le 5 à Paris
		expect(hasHappened('2026-11-06', new Date('2026-11-05T12:00:00Z'))).toBe(false);
	});

	it.each([
		[[yes, none], 'PROPOSED'],
		[[yes, accepted], 'ACCEPTED'],
		[[accepted, accepted], 'ACCEPTED'],
		[[yes, yes], 'COMPLETED'],
		[[yes], 'PROPOSED']
	] as const)('état %o → %s', (participants, status) => {
		expect(collabStatus(participants)).toBe(status);
	});

	it.each([
		['PROPOSED', none, true, 'respond'],
		['PROPOSED', yes, true, 'wait_other'],
		['ACCEPTED', accepted, false, 'wait_date'],
		['ACCEPTED', accepted, true, 'confirm'],
		['ACCEPTED', yes, true, 'wait_other'],
		['COMPLETED', yes, true, 'done'],
		['CANCELLED', accepted, true, 'cancelled']
	] as const)('%s, %o, a eu lieu=%s → %s', (status, me, happened, step) => {
		expect(nextStep(status, me, happened)).toBe(step);
	});
});

describe('collaborations liées au morceau (P4-06)', () => {
	const tracks = { me: ['MUSICIAN'], other: ['SOUND_ENGINEER'] };

	it('une répétition n’a pas de prestation', () => {
		expect(checkProvider('REHEARSAL', 'other', tracks)).toEqual({ ok: true, provider: null });
	});

	it('un enregistrement peut se faire sans ingé son', () => {
		expect(checkProvider('RECORDING', null, tracks)).toEqual({ ok: true, provider: null });
		expect(checkProvider('RECORDING', 'other', tracks)).toEqual({ ok: true, provider: 'other' });
	});

	it('un mixage exige quelqu’un qui a le métier', () => {
		expect(checkProvider('MIXING', null, tracks)).toMatchObject({ ok: false });
		expect(checkProvider('MIXING', 'me', tracks)).toMatchObject({
			ok: false,
			message: expect.stringMatching(/Ajoute le métier ingé son/)
		});
		expect(checkProvider('PRODUCTION', 'other', tracks)).toMatchObject({
			ok: false,
			message: expect.stringMatching(/producteur·rice/)
		});
	});

	it('chaque prestation sur un morceau a son étape', () => {
		expect(KIND_WORK_STAGE.RECORDING).toBe('recordedAt');
		expect(KIND_WORK_STAGE.LIVE_SOUND).toBeUndefined();
		expect(WORK_STAGES.map((s) => s.field)).toEqual([
			'recordedAt',
			'mixedAt',
			'masteredAt',
			'producedAt'
		]);
	});
});
