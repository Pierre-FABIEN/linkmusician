import { describe, expect, it } from 'vitest';
import { unsubscribeToken, verifyUnsubscribeToken } from './unsubscribe';

const KEY = 'clé-de-test';

describe('liens de désinscription', () => {
	it('un jeton valide donne l’acteur et le sujet', () => {
		const token = unsubscribeToken('actor1', 'MESSAGES', KEY);
		expect(verifyUnsubscribeToken(token, KEY)).toEqual({ actorId: 'actor1', topic: 'MESSAGES' });
		expect(verifyUnsubscribeToken(unsubscribeToken('actor1', 'ALL', KEY), KEY)?.topic).toBe('ALL');
	});

	it('refuse un jeton modifié, d’un autre sujet ou d’une autre clé', () => {
		const token = unsubscribeToken('actor1', 'MESSAGES', KEY);
		const [, , sig] = token.split('.');
		expect(verifyUnsubscribeToken(`actor2.MESSAGES.${sig}`, KEY)).toBeNull();
		expect(verifyUnsubscribeToken(`actor1.PROGRESS.${sig}`, KEY)).toBeNull();
		expect(verifyUnsubscribeToken(`actor1.INCONNU.${sig}`, KEY)).toBeNull();
		expect(verifyUnsubscribeToken(token, 'autre-clé')).toBeNull();
		expect(verifyUnsubscribeToken(`${token}.x`, KEY)).toBeNull();
		expect(verifyUnsubscribeToken('', KEY)).toBeNull();
	});
});
