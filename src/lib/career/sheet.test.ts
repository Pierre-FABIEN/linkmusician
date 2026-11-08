import { describe, expect, it } from 'vitest';
import { publicSheet, sheetLines } from './sheet';

const full = {
	jamsAppreciated: 4,
	peopleMet: 9,
	collaborations: 3,
	worksTogether: 1,
	credits: 2,
	gigs: 2,
	cities: ['Toulouse', 'Blagnac'],
	appreciatedBy: 6,
	bands: 1,
	actsPassed: [1, 2],
	jamsAttended: 7,
	worksSolo: 2,
	xp: 1840,
	level: 6
};

describe('fiche de carrière (P3-14)', () => {
	it('la fiche publique ne contient ni XP, ni niveau, ni confiance, ni déclaratif', () => {
		const json = JSON.stringify(publicSheet(full));
		for (const key of ['xp', 'level', 'trust', 'jamsAttended', 'worksSolo']) {
			expect(json).not.toContain(`"${key}"`);
		}
		expect(publicSheet(full)).toMatchObject({ jamsAppreciated: 4, actsPassed: [1, 2] });
	});

	it('des lignes lisibles, au singulier comme au pluriel', () => {
		const lines = sheetLines({ ...publicSheet(full), gigs: 1, cities: [] });
		expect(lines.find((l) => l.label === 'Concerts')?.value).toBe('1 corroboré');
		expect(lines.find((l) => l.label === 'Villes')?.value).toBe('Aucune pour l’instant');
	});
});
