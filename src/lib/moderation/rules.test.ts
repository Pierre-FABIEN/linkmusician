import { describe, expect, it } from 'vitest';
import { activeSuspension, addDays, isSanctionActive, normalizeDetails, reportRate } from './rules';

const now = new Date('2026-11-04T12:00:00Z');
const s = (kind: 'WARNING' | 'SUSPENSION', until: Date | null, liftedAt: Date | null = null) => ({
	kind,
	until,
	liftedAt
});

describe('sanctions', () => {
	it.each([
		['avertissement en cours', s('WARNING', addDays(now, 10)), true],
		['avertissement expiré', s('WARNING', addDays(now, -1)), false],
		['suspension sans fin', s('SUSPENSION', null), true],
		['suspension levée', s('SUSPENSION', null, addDays(now, -1)), false]
	])('%s', (_, sanction, active) => {
		expect(isSanctionActive(sanction, now)).toBe(active);
	});

	it('retient la suspension la plus longue, ignore les avertissements', () => {
		const week = s('SUSPENSION', addDays(now, 7));
		const month = s('SUSPENSION', addDays(now, 30));
		expect(activeSuspension([s('WARNING', addDays(now, 30)), week, month], now)).toBe(month);
		expect(activeSuspension([week, s('SUSPENSION', null)], now)?.until).toBeNull();
		expect(
			activeSuspension([s('WARNING', null), s('SUSPENSION', addDays(now, -1))], now)
		).toBeNull();
	});
});

describe('taux de signalement', () => {
	it.each([
		[0, 0, 0],
		[1, 0, 0.1],
		[1, 50, 0.02],
		[3, 20, 0.15]
	])('%i retenus pour %i médias → %d', (actioned, media, rate) => {
		expect(reportRate(actioned, media)).toBeCloseTo(rate);
	});
});

describe('texte d’un signalement', () => {
	it('reste du texte brut et borné', () => {
		expect(normalizeDetails('  spam\u0000 \t répété\r\n\r\n\r\n\r\nencore ')).toBe(
			'spam répété\n\nencore'
		);
		expect(normalizeDetails('x'.repeat(800))).toHaveLength(500);
	});
});
