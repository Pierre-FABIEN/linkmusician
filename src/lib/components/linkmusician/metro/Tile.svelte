<script lang="ts">
	/**
	 * LINKMUSICIAN: tuile Metro (refonte). Un seul composant pour toutes les
	 * cards : lien, bouton ou bloc selon les props. Le ton et la taille sont des
	 * attributs, la matière vit dans `metro.css`. Contenu libre en enfant ;
	 * classes utiles : `lm-tile__kicker`, `lm-tile__title`, `lm-tile__text`.
	 */
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Bell } from 'lucide-svelte';
	import TileFrame from './TileFrame.svelte';

	type Tone = 'violet' | 'rose' | 'blue' | 'orange' | 'amber' | 'lime' | 'cyan' | 'ink' | 'paper';
	type Size = 'sm' | 'md' | 'wide' | 'band' | 'tall' | 'big';

	let {
		tone = 'paper',
		size,
		href,
		index = 0,
		icon,
		framed = false,
		class: className = '',
		children,
		...rest
	}: {
		tone?: Tone;
		/** Sans taille : la tuile s'adapte à son conteneur (hors mosaïque). */
		size?: Size;
		href?: string;
		/** Rang d'apparition : décale l'entrée des tuiles d'un même pivot. */
		index?: number;
		/** Grande icône décorative en filigrane. */
		icon?: typeof Bell;
		/** Design « Jam » : la tuile se pose dans un `TileFrame` (ombre, survol sans repeinte). */
		framed?: boolean;
		children: Snippet;
	} & HTMLAttributes<HTMLElement> = $props();

	const tag = $derived(href ? 'a' : rest.onclick ? 'button' : 'div');
	const Icon = $derived(icon);
</script>

{#snippet tile()}
	<svelte:element
		this={tag}
		{...rest}
		href={href ?? undefined}
		type={tag === 'button' ? 'button' : undefined}
		class="lm-tile {className}"
		data-tone={tone}
		data-size={size}
		style:--i={framed ? undefined : index}
	>
		{#if Icon}<Icon class="lm-tile__mark" aria-hidden="true" />{/if}
		{@render children()}
	</svelte:element>
{/snippet}

{#if framed}
	<TileFrame {size} {index}>{@render tile()}</TileFrame>
{:else}
	{@render tile()}
{/if}
