import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { isHttpError, isRedirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { canReadDiagram, diagramIsPublic, readerIds, requireDiagramReader } from './access';

type Locals = Parameters<typeof canReadDiagram>[0];
const as = (role: string | null, id = 'u1'): Locals =>
	({ user: role === null ? null : { id }, role }) as unknown as Locals;

function thrown(fn: () => void) {
	try {
		fn();
	} catch (err) {
		return err;
	}
	return null;
}

describe('qui lit Melokiva Diagram (Q107, Q108)', () => {
	const none = new Set<string>();

	it('administration seulement, ou un identifiant explicitement autorisé', () => {
		expect(canReadDiagram(as(null), none, false)).toBe(false);
		expect(canReadDiagram(as('CLIENT'), none, false)).toBe(false);
		expect(canReadDiagram(as('MODERATOR'), none, false)).toBe(false);
		expect(canReadDiagram(as('ADMIN'), none, false)).toBe(true);
		expect(canReadDiagram(as('CLIENT', 'collab-1'), readerIds('collab-1, collab-2'), false)).toBe(
			true
		);
		expect(canReadDiagram(as('CLIENT', 'autre'), readerIds('collab-1'), false)).toBe(false);
	});

	it('la liste autorisée ignore les vides et les espaces', () => {
		expect([...readerIds(' a, ,b ,')]).toEqual(['a', 'b']);
		expect(readerIds('').size).toBe(0);
	});

	it('anonyme : redirection vers la connexion', () => {
		const err = thrown(() => requireDiagramReader(as(null), none, false));
		expect(isRedirect(err)).toBe(true);
		expect((err as { location: string }).location).toBe('/auth/login');
	});

	it('compte non autorisé : 404, comme une page qui n’existe pas', () => {
		const err = thrown(() => requireDiagramReader(as('CLIENT'), none, false));
		expect(isHttpError(err)).toBe(true);
		expect((err as { status: number }).status).toBe(404);
	});

	it('ouverture temporaire (Q110) : seulement si DIAGRAM_PUBLIC vaut « true »', () => {
		expect(diagramIsPublic('')).toBe(false);
		expect(diagramIsPublic('1')).toBe(false);
		expect(diagramIsPublic(' TRUE ')).toBe(true);
		expect(thrown(() => requireDiagramReader(as(null), none, true))).toBeNull();
		expect(thrown(() => requireDiagramReader(as('CLIENT'), none, true))).toBeNull();
		expect(canReadDiagram(as(null), none, true)).toBe(true);
	});

	it('administrateur : passe', () => {
		expect(thrown(() => requireDiagramReader(as('ADMIN'), none, false))).toBeNull();
	});
});

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((e) => {
		const full = path.join(dir, e);
		return statSync(full).isDirectory() ? walk(full) : [full];
	});
}

describe('chaque lecture de /diagram rappelle la garde', () => {
	const files = walk(path.resolve('src/routes/diagram'));
	const server = files.filter((f) => /\+(page|layout)\.server\.ts$|\+server\.ts$/.test(f));

	it('les fichiers serveur existent', () => {
		expect(server.length).toBeGreaterThan(8);
	});

	it.each(server.map((f) => [path.relative('src/routes', f), f]))('%s', (_, file) => {
		const source = readFileSync(file, 'utf8');
		expect(source).toMatch(
			/import \{[^}]*requireDiagramReader[^}]*\} from '#server\/diagram\/access'/
		);
		// La garde est la première instruction de chaque `load` et de chaque méthode.
		const handlers = [
			...source.matchAll(
				/export const (load|GET|POST|PUT|PATCH|DELETE)\b[^=]*=\s*async\s*\([^)]*\)\s*=>\s*\{\s*([^;]+);/g
			)
		];
		expect(handlers.length).toBeGreaterThan(0);
		for (const h of handlers) expect(h[2]).toMatch(/^requireDiagramReader\(locals\)$/);
	});

	it('aucune mutation : ni action de formulaire, ni méthode d’écriture', () => {
		for (const file of server) {
			const source = readFileSync(file, 'utf8');
			expect(source, file).not.toMatch(/export const actions/);
			expect(source, file).not.toMatch(
				/export (const|async function|function) (POST|PUT|PATCH|DELETE)\b/
			);
		}
	});

	it('aucun `load` universel : tout passe par le serveur', () => {
		expect(files.filter((f) => /\+(page|layout)\.ts$/.test(f))).toEqual([]);
	});
});

describe('aucune donnée réelle', () => {
	const modules = walk(path.resolve('src/lib/server/diagram')).filter((f) => f.endsWith('.ts'));

	it('le catalogue ne lit jamais la base', () => {
		for (const file of modules) {
			const source = readFileSync(file, 'utf8');
			// Imports seulement : une description peut citer `prisma.$transaction`.
			expect(source, file).not.toMatch(
				/from '(#lib\/server|\$lib\/server|@prisma\/client)'|import\s*\{[^}]*\bprisma\b[^}]*\}\s*from/
			);
		}
	});

	it('les sources ne sont pas servies telles quelles par static/', () => {
		const statics = walk(path.resolve('static')).map((f) => f.toLowerCase());
		expect(statics.filter((f) => f.endsWith('.drawio') || f.includes('diagram'))).toEqual([]);
	});
});
