<script lang="ts" generics="T">
	/**
	 * LINKMUSICIAN: liste de lignes en tuile `paper` (D55, `docs/design` §7.2) :
	 * conversations, notifications, candidatures. Chaque ligne est rendue par
	 * `row` ; avec `href`, elle devient un lien qui occupe toute la ligne.
	 */
	import type { Snippet } from 'svelte';

	let {
		items,
		key,
		label,
		href,
		row
	}: {
		items: readonly T[];
		key: (item: T) => string;
		/** Nom de la liste, pour les lecteurs d'écran. */
		label: string;
		href?: (item: T) => string | null;
		row: Snippet<[T]>;
	} = $props();
</script>

<ul class="lm-tile lm-tile--flow lm-list" aria-label={label}>
	{#each items as item (key(item))}
		{@const link = href?.(item)}
		<li>
			{#if link}
				<a class="lm-list__row" href={link}>{@render row(item)}</a>
			{:else}
				<div class="lm-list__row">{@render row(item)}</div>
			{/if}
		</li>
	{/each}
</ul>
