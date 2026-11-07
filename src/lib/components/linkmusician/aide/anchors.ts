/**
 * LINKMUSICIAN: ancres dans une page qui défile avec `smooth-scrollbar`
 * (boilerplate), qui ne suit pas les ancres du navigateur. Utilisé par le
 * centre d'aide et la feuille de route (`/admin/lancement`).
 */
import { get } from 'svelte/store';
import { replaceState } from '$app/navigation';
import Scrollbar from 'smooth-scrollbar';
import SmoothScrollBarStore from '#lib/store/SmoothScrollBarStore';

/** Fait défiler jusqu'à l'élément et y place le focus (clavier, lecteurs d'écran). */
export function scrollToId(id: string) {
	const target = document.getElementById(id);
	if (!target) return;
	// La barre la plus proche (l'administration en imbrique une dans celle
	// du site), sinon celle du site.
	const container = target.closest<HTMLElement>('[data-scrollbar]');
	const bar = (container && Scrollbar.get(container)) || get(SmoothScrollBarStore).smoothScroll;
	if (bar) {
		// Le contenu est positionné en absolu : on recalcule la hauteur
		// défilable avant de viser le titre.
		bar.update();
		const top =
			bar.scrollTop +
			target.getBoundingClientRect().top -
			bar.containerEl.getBoundingClientRect().top -
			24;
		bar.scrollTo(0, Math.max(0, top), 300);
	} else target.scrollIntoView();
	target.setAttribute('tabindex', '-1');
	target.focus({ preventScroll: true });
}

/** Action : les liens `#ancre` de la même page font défiler jusqu'à leur cible. */
export function anchorLinks(node: HTMLElement) {
	const onClick = (event: MouseEvent) => {
		const link = (event.target as HTMLElement).closest('a');
		if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey) return;
		const url = new URL(link.href);
		if (url.pathname !== location.pathname || !url.hash) return;
		event.preventDefault();
		replaceState(url.hash, {});
		scrollToId(decodeURIComponent(url.hash.slice(1)));
	};
	node.addEventListener('click', onClick);
	return { destroy: () => node.removeEventListener('click', onClick) };
}
