<script lang="ts">
	/**
	 * LINKMUSICIAN: cadre d'une tuile Metro (design « Jam »). C'est lui, et non
	 * la tuile, qui occupe la case de la mosaïque, porte l'ombre et bouge au
	 * survol : la tuile est en `overflow: hidden`, et un `transform` animé sur un
	 * élément qui découpe son contenu force Chrome à la repeindre à chaque image.
	 * Sur le cadre, sans découpe, le mouvement reste sur le compositeur.
	 * Voir « Tuile encadrée » dans `metro.css`.
	 */
	import type { Snippet } from 'svelte';
	import type { Size } from './tones';

	let {
		class: className = '',
		size,
		index,
		children
	}: {
		class?: string;
		size?: Size;
		/** Rang d'apparition : décale l'entrée des cadres d'un même pivot. */
		index?: number;
		children: Snippet;
	} = $props();
</script>

<div class="lm-tile-frame {className}" data-size={size} style:--i={index}>
	{@render children()}
</div>
