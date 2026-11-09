<script lang="ts">
	/**
	 * LINKMUSICIAN: un volet du panorama (refonte Metro). Son titre est un
	 * grand mot ; celui du volet suivant dépasse à droite, en retrait.
	 */
	import type { Snippet } from 'svelte';

	let { id, title, children }: { id: string; title: string; children: Snippet } = $props();
</script>

<section {id} data-pivot data-title={title} aria-labelledby="{id}-titre" class="lm-pivot">
	<h2 id="{id}-titre" class="lm-display lm-pivot__title">{title}</h2>
	{@render children()}
</section>
