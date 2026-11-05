import { describe, expect, it } from 'vitest';
import { applicationTransition, isPending } from './applications';

describe('candidatures (P2-03)', () => {
	it.each([
		['SENT', 'see', 'SEEN'],
		['SEEN', 'see', null],
		['SEEN', 'shortlist', 'SHORTLISTED'],
		['SHORTLISTED', 'shortlist', null],
		['SHORTLISTED', 'accept', 'ACCEPTED'],
		['SENT', 'decline', 'DECLINED'],
		['ACCEPTED', 'decline', null],
		['DECLINED', 'accept', null],
		['SEEN', 'withdraw', 'WITHDRAWN'],
		['ACCEPTED', 'withdraw', null],
		['WITHDRAWN', 'accept', null]
	] as const)('%s + %s → %s', (status, action, expected) => {
		expect(applicationTransition(status, action)).toBe(expected);
	});

	it('en attente tant qu’elle n’est pas tranchée', () => {
		expect(isPending('SHORTLISTED')).toBe(true);
		expect(isPending('ACCEPTED')).toBe(false);
	});
});
