/**
 * Mémorisation **limitée à une requête HTTP** (N3, conception 21 §13.2).
 *
 * Le layout et la page d'une même requête SvelteKit partagent `event.locals` :
 * on y accroche les lectures déjà lancées (une promesse par clé), pour qu'une
 * projection lue par deux chargements ne parte qu'une fois. Rien ne survit à
 * la requête (le `WeakMap` suit la vie de `locals`), rien n'est partagé
 * entre deux personnes : la clé porte toujours l'identité du lecteur, et
 * `locals` n'appartient qu'à la requête de ce lecteur.
 *
 * Sans portée (tests, tâches), la lecture part normalement, sans mémoire.
 */
export type RequestScope = object;

const store = new WeakMap<RequestScope, Map<string, Promise<unknown>>>();

export function requestMemo<T>(
	scope: RequestScope | undefined,
	key: string,
	read: () => Promise<T>
): Promise<T> {
	if (!scope) return read();
	let entries = store.get(scope);
	if (!entries) store.set(scope, (entries = new Map()));
	const hit = entries.get(key) as Promise<T> | undefined;
	if (hit) return hit;
	const promise = read();
	entries.set(key, promise);
	// Une lecture échouée n'est pas gardée : la suivante réessaie.
	promise.catch(() => entries.delete(key));
	return promise;
}
