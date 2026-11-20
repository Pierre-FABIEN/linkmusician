import { describe, expect, it } from 'vitest';
import { canViewActivity, othersAttendanceVisibleTo, participantBand } from './activities';

describe('confidentialité des activités (D81)', () => {
	it('privé par défaut : on ne voit que ses propres activités', () => {
		expect(canViewActivity({ viewerId: 'a', ownerId: 'a', context: 'jam.presents' })).toBe(true);
		for (const context of [
			'jam.presents',
			'jam.lineup',
			'jam.endorse',
			'contacts',
			'log'
		] as const) {
			expect(canViewActivity({ viewerId: 'a', ownerId: 'b', context })).toBe(false);
		}
	});

	it('le filtre des présences d’autrui ne laisse rien passer', () => {
		expect(othersAttendanceVisibleTo('a', 'log')).toEqual({
			actorId: { in: [] },
			NOT: { actorId: 'a' }
		});
	});

	it('les compteurs sont des tranches, jamais un nombre exact', () => {
		expect([0, 1, 4, 5, 9, 10, 40].map(participantBand)).toEqual([
			'none',
			'few',
			'few',
			'five',
			'five',
			'ten',
			'ten'
		]);
	});
});
