/**
 * LINKMUSICIAN: gardes de la modération (P0-04).
 *
 * Un modérateur traite les signalements et la file de modération, sans les
 * droits d'administration. Un administrateur peut aussi modérer. Même
 * découpage que `#lib/admin/guards` :
 *   - `assertModerator` redirige (pages, layouts) ;
 *   - `requireModerator` refuse net en 403 (actions, API), à appeler en
 *     première ligne : SvelteKit n'exécute pas le `load` du layout avant une
 *     action.
 */
import { error, redirect } from '@sveltejs/kit';

export type ModeratorRole = 'MODERATOR' | 'ADMIN';

export type ModeratorLocals = App.Locals & {
	user: NonNullable<App.Locals['user']>;
	role: ModeratorRole;
};

/** Le rôle permet-il de modérer ? */
export function canModerate(role: string | null | undefined): role is ModeratorRole {
	return role === 'MODERATOR' || role === 'ADMIN';
}

/** Exige un modérateur connecté, sinon redirige (connexion, ou accueil). */
export function assertModerator(locals: App.Locals): asserts locals is ModeratorLocals {
	if (!locals.user) throw redirect(302, '/auth/login');
	if (!canModerate(locals.role)) throw redirect(302, '/');
}

/** Exige un modérateur connecté, sinon 403. */
export function requireModerator(locals: App.Locals): asserts locals is ModeratorLocals {
	if (!locals.user || !canModerate(locals.role)) throw error(403, 'Forbidden');
}
