/**
 * LINKMUSICIAN: relecture du code pour l'inventaire (DIAGRAM-01, DIAGRAM-06).
 *
 * Lit les routes avec le compilateur TypeScript (pas d'expression régulière) :
 * clés de `export const actions` d'un `+page.server.ts`, méthodes HTTP
 * exportées d'un `+server.ts`. Lit aussi les modèles de `schema.prisma`, les
 * décisions du registre et les exports d'un module de service.
 *
 * Réservé aux tests et à `scripts/diagram/sync.ts` (Node) : jamais importé
 * par une page.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export interface ScannedTrigger {
	route: string;
	kind: 'action' | 'endpoint';
	name: string;
}

const HTTP = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'fallback']);

function walk(dir: string, out: string[] = []) {
	for (const entry of readdirSync(dir)) {
		const full = path.join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else out.push(full);
	}
	return out;
}

const routeIdOf = (root: string, file: string) => {
	const rel = path.relative(root, path.dirname(file)).split(path.sep).join('/');
	return rel ? `/${rel}` : '/';
};

function unwrap(node: ts.Expression): ts.Expression {
	let current = node;
	while (
		ts.isSatisfiesExpression(current) ||
		ts.isAsExpression(current) ||
		ts.isParenthesizedExpression(current)
	) {
		current = current.expression;
	}
	return current;
}

function propertyName(name: ts.PropertyName): string | null {
	if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
		return name.text;
	}
	return null;
}

/** Clés de l'objet `actions` exporté. */
export function actionNames(source: string, fileName = 'x.ts'): string[] {
	const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
	const names: string[] = [];
	for (const statement of file.statements) {
		if (!ts.isVariableStatement(statement)) continue;
		const exported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
		if (!exported) continue;
		for (const decl of statement.declarationList.declarations) {
			if (!ts.isIdentifier(decl.name) || decl.name.text !== 'actions' || !decl.initializer)
				continue;
			const init = unwrap(decl.initializer);
			if (!ts.isObjectLiteralExpression(init)) continue;
			for (const prop of init.properties) {
				if (
					ts.isPropertyAssignment(prop) ||
					ts.isMethodDeclaration(prop) ||
					ts.isShorthandPropertyAssignment(prop)
				) {
					const name = propertyName(prop.name);
					if (name) names.push(name);
				}
			}
		}
	}
	return names;
}

/** Méthodes HTTP exportées (`export const GET`, `export async function POST`). */
export function httpMethods(source: string, fileName = 'x.ts'): string[] {
	const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
	const methods: string[] = [];
	for (const statement of file.statements) {
		const exported =
			ts.canHaveModifiers(statement) &&
			ts.getModifiers(statement)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
		if (!exported) continue;
		if (ts.isFunctionDeclaration(statement) && statement.name && HTTP.has(statement.name.text)) {
			methods.push(statement.name.text);
		}
		if (ts.isVariableStatement(statement)) {
			for (const decl of statement.declarationList.declarations) {
				if (ts.isIdentifier(decl.name) && HTTP.has(decl.name.text)) methods.push(decl.name.text);
			}
		}
	}
	return methods;
}

/** Tous les déclencheurs du code : actions et endpoints. */
export function scanRoutes(root = path.resolve('src/routes')): ScannedTrigger[] {
	const found: ScannedTrigger[] = [];
	for (const file of walk(root).sort()) {
		const base = path.basename(file);
		const route = routeIdOf(root, file);
		if (base === '+page.server.ts') {
			for (const name of actionNames(readFileSync(file, 'utf8'), file)) {
				found.push({ route, kind: 'action', name });
			}
		} else if (base === '+server.ts') {
			for (const name of httpMethods(readFileSync(file, 'utf8'), file)) {
				found.push({ route, kind: 'endpoint', name });
			}
		}
	}
	return found;
}

/** Noms des modèles de `schema.prisma`. */
export function prismaModels(schema = readFileSync('prisma/schema.prisma', 'utf8')): string[] {
	return [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]);
}

export interface DecisionInfo {
	id: string;
	title: string;
	status: 'ACCEPTED' | 'PROPOSED' | 'REJECTED' | 'REPLACED' | 'UNKNOWN';
	/** Libellé de statut tel qu'écrit dans le registre, sans mise en forme. */
	label: string;
}

/** Décisions du registre `docs/decisions/README.md` (une ligne par décision). */
export function decisions(
	registry = readFileSync('docs/decisions/README.md', 'utf8')
): Record<string, DecisionInfo> {
	const out: Record<string, DecisionInfo> = {};
	for (const line of registry.split('\n')) {
		const m = line.match(/^\|\s*(D\d+)\s*\|([^|]*)\|[^|]*\|([^|]*)\|/);
		if (!m) continue;
		const label = m[3].replace(/\*\*/g, '').trim();
		const first = label.toLowerCase();
		// Le statut qui ouvre la cellule l'emporte (« Acceptée … ; révision proposée »).
		const status: DecisionInfo['status'] = first.startsWith('accept')
			? 'ACCEPTED'
			: first.startsWith('propos')
				? 'PROPOSED'
				: first.startsWith('rejet')
					? 'REJECTED'
					: first.startsWith('rempla')
						? 'REPLACED'
						: 'UNKNOWN';
		out[m[1]] = { id: m[1], title: m[2].trim(), status, label };
	}
	return out;
}

/**
 * Une référence de service `server/projects/needs.addNeed` existe-t-elle ?
 * Le module est un fichier de `src/lib/` (`.ts`, ou `index.ts` d'un dossier) ;
 * la fonction, si elle est nommée, y est exportée.
 */
export function serviceExists(ref: string): boolean {
	const [modulePath, fn] = splitService(ref);
	const file = [`src/lib/${modulePath}.ts`, `src/lib/${modulePath}/index.ts`].find(existsSync);
	if (!file) return false;
	if (!fn) return true;
	const source = readFileSync(file, 'utf8');
	return new RegExp(
		`export\\s+(async\\s+)?(function\\s+${fn}\\b|const\\s+${fn}\\b|\\{[^}]*\\b${fn}\\b)`
	).test(source);
}

export function splitService(ref: string): [string, string | null] {
	const slash = ref.lastIndexOf('/');
	const dot = ref.indexOf('.', slash);
	return dot === -1 ? [ref, null] : [ref.slice(0, dot), ref.slice(dot + 1)];
}

export const fileExists = (p: string) => existsSync(p);
