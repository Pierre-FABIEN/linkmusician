import { describe, expect, it } from 'vitest';
import { canOrganizeJams, mayOfferToOrganize } from './organizer';

const now = new Date('2026-11-08T12:00:00Z');
const adult = new Date('1995-06-15T00:00:00Z');
const minor = new Date('2010-06-15T00:00:00Z');

describe('canOrganizeJams', () => {
	it.each([
		['adulte qui a coché', true, adult, true],
		['adulte qui n’a pas coché', false, adult, false],
		['mineur·e, même coché', true, minor, false],
		['date de naissance inconnue', true, null, false]
	])('%s', (_, organizesJams, birthDate, expected) => {
		expect(canOrganizeJams({ organizesJams, birthDate }, now)).toBe(expected);
	});
});

describe('mayOfferToOrganize', () => {
	it('adultes seulement', () => {
		expect(mayOfferToOrganize(adult, now)).toBe(true);
		expect(mayOfferToOrganize(minor, now)).toBe(false);
	});
});
