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
 *
 * Ouverture temporaire (Q110) : `DIAGRAM_PUBLIC=true` rend `/diagram` lisible
 * par tout le monde, sans compte, dans l'environnement qui la pose. Absente,
 * la garde ci-dessus s'applique. Les en-têtes privés et `noindex` restent.
 */
import { error, redirect } from '@sveltejs/kit';
// Déclarées dans `src/env.ts` (SvelteKit 3 n'expose que les variables
// déclarées) ; lues à l'exécution, absentes = `undefined`.
import { DIAGRAM_PUBLIC, DIAGRAM_READER_IDS } from '$app/env/private';

type Locals = Pick<App.Locals, 'user' | 'role'>;

/** Identifiants autorisés en plus des administrateurs. */
export function readerIds(raw: string | undefined = DIAGRAM_READER_IDS) {
	return new Set(
		(raw ?? '')
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean)
	);
}

/** `/diagram` ouvert à tous dans cet environnement (Q110, temporaire). */
export function diagramIsPublic(raw: string | undefined = DIAGRAM_PUBLIC) {
	return raw?.trim().toLowerCase() === 'true';
}

export function canReadDiagram(locals: Locals, allowed = readerIds(), open = diagramIsPublic()) {
	if (open) return true;
	if (!locals.user) return false;
	return locals.role === 'ADMIN' || allowed.has(locals.user.id);
}

/** Garde de toute lecture sous `/diagram`. */
export function requireDiagramReader(
	locals: Locals,
	allowed = readerIds(),
	open = diagramIsPublic()
) {
	if (open) return;
	if (!locals.user) redirect(302, '/auth/login');
	if (!canReadDiagram(locals, allowed, false)) error(404, 'Introuvable');
}

/** En-têtes d'une page interne : jamais en cache partagé, jamais indexée. */
export const PRIVATE_HEADERS = {
	'cache-control': 'private, no-store',
	'x-robots-tag': 'noindex, nofollow'
} as const;
