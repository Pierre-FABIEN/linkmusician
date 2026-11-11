<script lang="ts">
	/**
	 * LINKMUSICIAN: état vide Metro (D55, `docs/design` §6) : une tuile
	 * `paper`, une icône en filigrane, une phrase et, s'il y en a une,
	 * l'action qui fait avancer.
	 */
	import type { Bell } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import Tile from './Tile.svelte';

	let {
		icon,
		title,
		text,
		action
	}: {
		icon?: typeof Bell;
		title?: string;
		text: string;
		action?: { href: string; label: string } | Snippet;
	} = $props();
</script>

<Tile tone="paper" {icon} class="lm-empty">
	<div class="space-y-2">
		{#if title}<p class="lm-tile__title">{title}</p>{/if}
		<p class="lm-tile__text">{text}</p>
	</div>
	{#if typeof action === 'function'}
		{@render action()}
	{:else if action}
		<a class="lm-btn self-start" href={action.href}>{action.label}</a>
	{/if}
</Tile>
