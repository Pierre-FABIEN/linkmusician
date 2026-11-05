/**
 * LINKMUSICIAN: déplace un élément sous `<body>`. Le contenu des pages vit
 * dans le conteneur de défilement du boilerplate (`SmoothScrollBar`), qui
 * utilise `transform` : un `position: fixed` y serait relatif au contenu et
 * défilerait avec lui. La barre d'onglets mobile en a besoin.
 */
export function portal(node: HTMLElement) {
	document.body.appendChild(node);
	return {
		destroy() {
			node.remove();
		}
	};
}
