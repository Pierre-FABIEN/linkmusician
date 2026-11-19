/**
 * LINKMUSICIAN: accès à Melokiva Diagram (DIAGRAM-02, D80, Q107, Q108).
 *
 * Autorisation interne explicite : le rôle `ADMIN`, ou un identifiant de
 * compte listé dans `DIAGRAM_READER_IDS` (variable serveur, séparée par des
 * virgules) pour un collaborateur technique sans droits d'administration.
 *
 * Chaque `load` et chaque endpoint de `/diagram` appelle
 * `requireDiagramReader` : SvelteKit n'exécute pas le `load` du layout avant
 * un endpoint, et masquer un lien ne protège rien. Anonyme → connexion ;
 * compte non autorisé → 404, comme une page qui n'existe pas (Q108).
 */
import { error, redirect } from '@sveltejs/kit';

type Locals = Pick<App.Locals, 'user' | 'role'>;

/** Identifiants autorisés en plus des administrateurs. */
export function readerIds(raw: string | undefined = process.env.DIAGRAM_READER_IDS) {
	return new Set(
		(raw ?? '')
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean)
	);
}

export function canReadDiagram(locals: Locals, allowed = readerIds()) {
	if (!locals.user) return false;
	return locals.role === 'ADMIN' || allowed.has(locals.user.id);
}

/** Garde de toute lecture sous `/diagram`. */
export function requireDiagramReader(locals: Locals, allowed = readerIds()) {
	if (!locals.user) redirect(302, '/auth/login');
	if (!canReadDiagram(locals, allowed)) error(404, 'Introuvable');
}

/** En-têtes d'une page interne : jamais en cache partagé, jamais indexée. */
export const PRIVATE_HEADERS = {
	'cache-control': 'private, no-store',
	'x-robots-tag': 'noindex, nofollow'
} as const;
