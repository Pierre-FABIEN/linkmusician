/**
 * LINKMUSICIAN: Espace active les contrôles natifs (T11, WCAG 2.1.1).
 *
 * Le module clavier de `smooth-scrollbar` 8.8.4 (`events/keyboard.js`)
 * traduit Espace en défilement de 200 px dès que le focus est dans la
 * page, sauf sur `input`, `select` et `textarea`, et appelle
 * `preventDefault()` : un `<button>` ou un `<summary>` ne s'active plus.
 *
 * Ce plugin agit seulement sur un `keydown` Espace dont la cible est un
 * contrôle que le navigateur active lui-même à l'Espace : il annule le
 * défilement (delta nul) et rend sans effet le `preventDefault()` de la
 * bibliothèque, pour cet événement et le temps de son écouteur. Le
 * défilement au clavier (flèches, pages, Espace hors contrôle) reste intact.
 * Un lien n'est pas concerné : Espace fait défiler la page, comme ailleurs.
 */
// Import par défaut : côté serveur, Vite charge le paquet CommonJS, dont les
// exports nommés ne sont pas résolus ; la classe porte le plugin en statique.
import Scrollbar from 'smooth-scrollbar';

const { ScrollbarPlugin } = Scrollbar;

const ACTIVATED_BY_SPACE =
	'button, summary, [role="button"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"]';

/** Vrai si Espace doit activer l'élément plutôt que faire défiler. */
export function activatesOnSpace(target: EventTarget | null): boolean {
	if (!(target instanceof Element)) return false;
	if (target.matches(':disabled')) return false;
	return target.matches(ACTIVATED_BY_SPACE);
}

function isSpace(evt: Event): evt is KeyboardEvent {
	return (
		evt.type === 'keydown' &&
		((evt as KeyboardEvent).key === ' ' || (evt as KeyboardEvent).code === 'Space')
	);
}

export class NativeSpacePlugin extends ScrollbarPlugin {
	static pluginName = 'lmNativeSpace';

	transformDelta(delta: { x: number; y: number }, evt: Event) {
		if (!isSpace(evt) || !activatesOnSpace(document.activeElement)) return delta;
		// La bibliothèque appelle `preventDefault()` juste après ce calcul : on
		// l'ombre sur cette instance, puis on rend la méthode du prototype avant
		// l'écouteur suivant (point de contrôle des microtâches entre écouteurs).
		Object.defineProperty(evt, 'preventDefault', { value: () => {}, configurable: true });
		queueMicrotask(() => {
			delete (evt as { preventDefault?: unknown }).preventDefault;
		});
		return { x: 0, y: 0 };
	}
}
