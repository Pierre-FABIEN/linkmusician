import { describe, expect, it } from 'vitest';
import {
	incidentDecisionSchema,
	isReportWindowOpen,
	jamReportSchema,
	restrictionDays
} from './incidents';

const HOUR = 3_600_000;
const jam = {
	startsAt: new Date('2026-11-14T19:00:00Z'),
	endsAt: new Date('2026-11-14T22:00:00Z')
};

describe('jams signalées (#91b)', () => {
	it('fenêtre : du début à 24 h après la fin', () => {
		expect(isReportWindowOpen(jam, new Date(jam.startsAt.getTime() - 1))).toBe(false);
		expect(isReportWindowOpen(jam, jam.startsAt)).toBe(true);
		expect(isReportWindowOpen(jam, new Date(jam.endsAt.getTime() + 24 * HOUR))).toBe(true);
		expect(isReportWindowOpen(jam, new Date(jam.endsAt.getTime() + 24 * HOUR + 1))).toBe(false);
	});

	it('le signalement exige la déclaration « sur place »', () => {
		expect(jamReportSchema.safeParse({ reason: 'NO_JAM', wentThere: false }).success).toBe(false);
		expect(jamReportSchema.safeParse({ reason: 'NO_JAM', wentThere: true }).success).toBe(true);
		expect(jamReportSchema.safeParse({ reason: 'AUTRE', wentThere: true }).success).toBe(false);
	});

	it('un dossier classé ne sanctionne pas ; la décision s’explique', () => {
		expect(
			incidentDecisionSchema.safeParse({
				decision: 'dismiss',
				sanction: 'warning',
				note: 'Bonne foi'
			}).success
		).toBe(false);
		expect(incidentDecisionSchema.safeParse({ decision: 'confirm', note: '' }).success).toBe(false);
		expect(
			incidentDecisionSchema.safeParse({
				decision: 'confirm',
				sanction: 'restrict7',
				note: 'Fausse jam'
			}).success
		).toBe(true);
	});

	it('durées : 7 jours, 30 jours, sans limite, ou aucune restriction', () => {
		expect(restrictionDays('restrict7')).toBe(7);
		expect(restrictionDays('restrict30')).toBe(30);
		expect(restrictionDays('restrictIndefinite')).toBeNull();
		expect(restrictionDays('warning')).toBeUndefined();
		expect(restrictionDays('none')).toBeUndefined();
	});
});
