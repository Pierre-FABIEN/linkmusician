import { describe, expect, it } from 'vitest';
import { connectionOf } from '../../../prisma/client.js';

// Prisma 7 (DT-01a) : l'adaptateur ignore `?schema=`, la fabrique doit
// l'extraire pour le passer en option, sinon les tests écrivent dans `public`.
describe('connexion du client Prisma', () => {
	it('extrait le schéma et le retire de l’URL', () => {
		const { connectionString, schema } = connectionOf(
			'postgresql://u:p@h-pooler.neon.tech/db?sslmode=require&schema=e2e'
		);
		expect(schema).toBe('e2e');
		expect(new URL(connectionString).searchParams.has('schema')).toBe(false);
	});

	it('sans schéma : `public` par défaut (aucune option)', () => {
		expect(connectionOf('postgresql://u:p@h/db').schema).toBeUndefined();
	});

	it('écrit `sslmode=verify-full`, le sens que `pg` donne déjà à `require`', () => {
		const ssl = (url: string) =>
			new URL(connectionOf(url).connectionString).searchParams.get('sslmode');
		expect(ssl('postgresql://u:p@h/db?sslmode=require')).toBe('verify-full');
		expect(ssl('postgresql://u:p@h/db?sslmode=disable')).toBe('disable');
		expect(ssl('postgresql://u:p@h/db')).toBeNull();
	});
});
