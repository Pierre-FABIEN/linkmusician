import { describe, expect, it } from 'vitest';
import { qualifiedTable, schemaOf } from './db-schema';

describe('schéma du SQL brut', () => {
	it.each([
		['postgresql://u:p@h/db?sslmode=require&schema=e2e', 'e2e'],
		['postgresql://u:p@h/db?sslmode=require', 'public'],
		['pas une url', 'public'],
		[undefined, 'public']
	])('%s → %s', (url, schema) => {
		expect(schemaOf(url ?? '')).toBe(schema);
	});

	it('qualifie la table', () => {
		expect(qualifiedTable('actor_locations', 'e2e').sql).toBe('"e2e"."actor_locations"');
	});

	it('refuse un identifiant dangereux', () => {
		expect(() => qualifiedTable('actor_locations', 'e2e"; DROP TABLE x; --')).toThrow();
	});
});
