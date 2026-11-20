import { describe, expect, it } from 'vitest';
import { appWriteRefusal, isAppWrite, refusalResponse } from './appWriteGuard';

const user = { id: 'u1', emailVerified: true };

describe('garde des écritures (app) (RV-01, #100)', () => {
	it('ne vise que les écritures vers le groupe (app)', () => {
		expect(isAppWrite('POST', '/(app)/jams/[id]')).toBe(true);
		expect(isAppWrite('delete', '/(app)/groupes/[handle]/programme')).toBe(true);
		expect(isAppWrite('GET', '/(app)/jams/[id]')).toBe(false);
		expect(isAppWrite('HEAD', '/(app)/jams/[id]')).toBe(false);
		expect(isAppWrite('POST', '/auth/login')).toBe(false);
		expect(isAppWrite('POST', '/qui-es-tu')).toBe(false);
		expect(isAppWrite('POST', null)).toBe(false);
	});

	it('refuse un compte suspendu, comme la garde du layout', () => {
		expect(appWriteRefusal({ user, personActorId: 'a1', suspended: true })).toBe('/suspendu');
		expect(appWriteRefusal({ user, personActorId: 'a1', suspended: false })).toBeNull();
	});

	it('refuse sans compte, sans e-mail vérifié ou sans personne', () => {
		expect(appWriteRefusal({ user: null, personActorId: null, suspended: false })).toBe(
			'/auth/login'
		);
		expect(
			appWriteRefusal({
				user: { id: 'u1', emailVerified: false },
				personActorId: 'a1',
				suspended: false
			})
		).toBe('/auth/verify-email');
		expect(appWriteRefusal({ user, personActorId: null, suspended: false })).toBe('/bienvenue');
	});

	it('répond un résultat d’action à use:enhance, une redirection sinon', async () => {
		const enhanced = refusalResponse('/suspendu', true);
		expect(await enhanced.json()).toEqual({ type: 'redirect', status: 303, location: '/suspendu' });
		const plain = refusalResponse('/suspendu', false);
		expect(plain.status).toBe(303);
		expect(plain.headers.get('location')).toBe('/suspendu');
	});
});
