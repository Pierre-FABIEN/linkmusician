/**
 * Garde des écritures de l'espace LinkMusician (RV-01, #100).
 *
 * La garde du layout `(app)` (compte connecté, e-mail vérifié, personne,
 * suspension) ne protège que les lectures : dans SvelteKit, une action de
 * formulaire s'exécute **avant** les `load`. Sans ce hook, un compte
 * suspendu pouvait encore publier une jam, inviter, apprécier ou écrire
 * en postant directement sur une action. Comme `adminHandle` pour `/admin`,
 * ce hook couvre toute requête qui n'est pas une lecture (POST, PUT,
 * PATCH, DELETE) vers une route du groupe `(app)`, actions et `+server.ts`.
 *
 * Les étapes d'arrivée (métier, onboarding) restent à la garde du layout :
 * elles vivent hors de `(app)` et n'ouvrent aucune action ici.
 */
import type { Handle } from '@sveltejs/kit/hooks';
import { getPersonByUserId } from '#lib/prisma/actors/person';
import { currentSuspension } from '#lib/server/moderation/service';

const READS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** La requête écrit-elle dans l'espace LinkMusician ? */
export function isAppWrite(method: string, routeId: string | null): boolean {
	return !READS.has(method.toUpperCase()) && !!routeId?.startsWith('/(app)/');
}

type Who = {
	user: { id: string; emailVerified: boolean } | null | undefined;
	personActorId: string | null;
	suspended: boolean;
};

/** Où renvoyer une écriture refusée (même ordre que la garde du layout), ou `null`. */
export function appWriteRefusal({ user, personActorId, suspended }: Who): string | null {
	if (!user) return '/auth/login';
	if (!user.emailVerified) return '/auth/verify-email';
	if (!personActorId) return '/bienvenue';
	if (suspended) return '/suspendu';
	return null;
}

/** Réponse de refus : un résultat d'action `redirect` pour `use:enhance`, sinon une redirection 303. */
export function refusalResponse(location: string, viaEnhance: boolean): Response {
	if (viaEnhance) {
		return new Response(JSON.stringify({ type: 'redirect', status: 303, location }), {
			headers: { 'content-type': 'application/json' }
		});
	}
	return new Response(null, { status: 303, headers: { location } });
}

/** À placer après `authHandle`, qui peuple `locals.user`. */
export const appWriteHandle: Handle = async ({ event, resolve }) => {
	if (!isAppWrite(event.request.method, event.route.id)) return resolve(event);
	const user = event.locals.user;
	const person = user?.emailVerified ? await getPersonByUserId(user.id) : null;
	const refusal = appWriteRefusal({
		user,
		personActorId: person?.actorId ?? null,
		suspended: person ? Boolean(await currentSuspension(person.actorId)) : false
	});
	if (!refusal) return resolve(event);
	return refusalResponse(refusal, event.request.headers.get('x-sveltekit-action') === 'true');
};
