import { describe, expect, it } from 'vitest';
import { MILESTONE_CATALOG } from './rules';
import { contestRefusal, freezesOnReport, isContestable, retractBlocker } from './disputes';

describe('isContestable', () => {
	it('seulement les étapes déclarées par le groupe', () => {
		expect(isContestable('FIRST_GIG')).toBe(true);
		expect(isContestable('FIRST_REHEARSAL')).toBe(true);
		expect(isContestable('FORMATION')).toBe(false);
		expect(isContestable('FIRST_COMPOSITION')).toBe(false);
		for (const d of MILESTONE_CATALOG) expect(isContestable(d.key)).toBe(d.mode === 'declare');
	});
});

describe('freezesOnReport', () => {
	it.each([
		[0, false],
		[1, true],
		[3, true]
	])('palier %i → %s', (trust, expected) => {
		expect(freezesOnReport(trust)).toBe(expected);
	});
});

describe('contestRefusal', () => {
	const ok = {
		key: 'FIRST_GIG' as const,
		reporterIsMember: false,
		details: 'Ce concert n’a pas eu lieu'
	};
	it.each([
		['contestation valable', {}, null],
		['formation', { key: 'FORMATION' as const }, 'not_contestable'],
		['membre du groupe', { reporterIsMember: true }, 'own'],
		['sans explication', { details: '  faux  ' }, 'too_short']
	])('%s', (_, patch, expected) => {
		expect(contestRefusal({ ...ok, ...patch })).toBe(expected);
	});
});

describe('retractBlocker', () => {
	const ok = { key: 'FIRST_GIG' as const, frozen: false, dissolved: false };
	it('une étape déclarée se retire', () => expect(retractBlocker(ok)).toBeNull());
	it('pas pendant la vérification', () =>
		expect(retractBlocker({ ...ok, frozen: true })).toMatch(/vérification/));
	it('pas la formation', () =>
		expect(retractBlocker({ ...ok, key: 'FORMATION' })).toMatch(/toute seule/));
	it('pas un groupe dissous', () =>
		expect(retractBlocker({ ...ok, dissolved: true })).toMatch(/dissous/));
});
