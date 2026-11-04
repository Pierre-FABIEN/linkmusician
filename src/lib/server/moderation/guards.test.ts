import { describe, expect, it } from 'vitest';
import { assertModerator, canModerate, requireModerator } from './guards';

const locals = (role: string | null) =>
	({ user: role ? { id: 'u1' } : null, role }) as unknown as App.Locals;

describe('canModerate', () => {
	it('ouvre la modération aux modérateurs et aux administrateurs', () => {
		expect(canModerate('MODERATOR')).toBe(true);
		expect(canModerate('ADMIN')).toBe(true);
	});

	it('la ferme aux autres rôles', () => {
		expect(canModerate('CLIENT')).toBe(false);
		expect(canModerate(null)).toBe(false);
		expect(canModerate(undefined)).toBe(false);
	});
});

describe('gardes', () => {
	it('requireModerator refuse en 403 un compte sans le rôle', () => {
		expect(() => requireModerator(locals('CLIENT'))).toThrow(
			expect.objectContaining({ status: 403 })
		);
		expect(() => requireModerator(locals(null))).toThrow(expect.objectContaining({ status: 403 }));
		expect(() => requireModerator(locals('MODERATOR'))).not.toThrow();
	});

	it('assertModerator redirige un anonyme vers la connexion, un client vers l’accueil', () => {
		expect(() => assertModerator(locals(null))).toThrow(
			expect.objectContaining({ status: 302, location: '/auth/login' })
		);
		expect(() => assertModerator(locals('CLIENT'))).toThrow(
			expect.objectContaining({ status: 302, location: '/' })
		);
		expect(() => assertModerator(locals('ADMIN'))).not.toThrow();
	});
});
