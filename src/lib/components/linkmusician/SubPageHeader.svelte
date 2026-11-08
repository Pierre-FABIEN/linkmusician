<script lang="ts">
	/** LINKMUSICIAN: en-tête d'un écran ouvert depuis une page-menu (D50) : retour au menu, titre. */
	import { ArrowLeft } from 'lucide-svelte';

	let {
		backHref,
		backLabel,
		title,
		intro
	}: { backHref: string; backLabel: string; title: string; intro?: string } = $props();
</script>

<header class="space-y-2">
	<a
		href={backHref}
		class="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
		><ArrowLeft class="size-4" aria-hidden="true" />{backLabel}</a
	>
	<h1 class="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
	{#if intro}<p class="max-w-2xl text-muted-foreground">{intro}</p>{/if}
</header>
