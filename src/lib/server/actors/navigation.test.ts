import { describe, expect, it, vi } from 'vitest';
import { readNavigation, saveNavigation } from './navigation';

const person = {
	actorId: 'alice',
	tracks: [
		{ track: 'MUSICIAN' as const, isPrimary: true },
		{ track: 'SOUND_ENGINEER' as const, isPrimary: false }
	]
};
const cookies = (value: string) => ({ get: () => value });

describe('contexte de session métier', () => {
	it('restaure uniquement un métier détenu par ce compte', () => {
		expect(
			readNavigation(
				person,
				cookies(JSON.stringify({ personId: 'alice', track: 'SOUND_ENGINEER' }))
			)?.active
		).toBe('SOUND_ENGINEER');
		for (const value of [
			'invalid',
			'null',
			JSON.stringify({ personId: 'bob', track: 'SOUND_ENGINEER' }),
			JSON.stringify({ personId: 'alice', track: 'MANAGER' })
		]) {
			expect(readNavigation(person, cookies(value))?.active).toBe('MUSICIAN');
		}
	});
	it('ne pose aucun cookie pour un métier non détenu et protège le cookie de session', () => {
		const set = vi.fn();
		expect(saveNavigation(person, 'MANAGER', { set })).toBe(false);
		expect(set).not.toHaveBeenCalled();
		expect(saveNavigation(person, 'SOUND_ENGINEER', { set })).toBe(true);
		expect(set.mock.calls[0][2]).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
		expect(set.mock.calls[0][2]).not.toHaveProperty('maxAge');
	});
});
