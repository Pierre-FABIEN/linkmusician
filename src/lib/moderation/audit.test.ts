import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AUDIT_ACTIONS, actionsOf, auditLabel } from './audit';

/** Actions `moderation.*` écrites dans le code serveur. */
function actionsInCode(): string[] {
	const found = new Set<string>();
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir)) {
			const full = path.join(dir, entry);
			if (statSync(full).isDirectory()) walk(full);
			else if (full.endsWith('.ts') && !full.includes('.test.')) {
				for (const m of readFileSync(full, 'utf8').matchAll(/'(moderation\.[a-z_.]+)'/g)) {
					found.add(m[1]);
				}
			}
		}
	};
	walk(path.resolve('src/lib/server'));
	return [...found];
}

describe('journal de modération', () => {
	it('chaque décision tracée dans le code a un libellé', () => {
		const code = actionsInCode();
		expect(code.length).toBeGreaterThan(10);
		for (const action of code) expect(Object.keys(AUDIT_ACTIONS)).toContain(action);
	});
	it('les sanctions (action composée) ont leur libellé', () => {
		expect(auditLabel('moderation.sanction.warning')).toBe('Avertissement');
		expect(auditLabel('moderation.sanction.suspension')).toBe('Suspension');
	});
	it('une action inconnue reste lisible telle quelle', () => {
		expect(auditLabel('admin.user.delete')).toBe('admin.user.delete');
	});
	it('filtre par famille', () => {
		expect(actionsOf('venues')).toEqual(['moderation.venue.validate', 'moderation.venue.remove']);
	});
});
