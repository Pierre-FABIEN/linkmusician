import { describe, expect, it } from 'vitest';
import { progressMessage } from './messages';

describe('progressMessage', () => {
	it('laisse le message tel quel sans progression', () => {
		expect(progressMessage('Enregistré.', { xp: 0, achievements: [], levelUp: null })).toBe(
			'Enregistré.'
		);
	});

	it('annonce XP, niveau et succès', () => {
		expect(
			progressMessage('Enregistré.', {
				xp: 150,
				achievements: ['profile-complete', 'inconnu'],
				levelUp: { from: 1, to: 2 }
			})
		).toBe(
			'Enregistré. · +150 XP · Niveau 2 atteint ! · Succès débloqué : Carte de visite · Succès débloqué : inconnu'
		);
	});
});
