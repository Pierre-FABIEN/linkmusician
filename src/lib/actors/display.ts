/**
 * Affichage d'un acteur (P1-11) : initiales de l'avatar par défaut.
 */

/** Deux initiales au plus, en majuscules (« Léa Martin » → « LM »). */
export function initialsOf(displayName: string): string {
	return (
		displayName
			.trim()
			.split(/[\s-]+/)
			.filter(Boolean)
			.map((w) => [...w][0])
			.join('')
			.slice(0, 2)
			.toUpperCase() || '?'
	);
}
