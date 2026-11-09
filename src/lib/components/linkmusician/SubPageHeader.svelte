<script lang="ts">
	/**
	 * LINKMUSICIAN: en-tête d'un écran ouvert depuis une page-menu (D50). Le
	 * retour au menu passe par le fil d'Ariane de la coquille (D52).
	 */
	let { title, intro }: { title: string; intro?: string } = $props();
</script>

<header class="space-y-2">
	<h1 class="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
	{#if intro}<p class="max-w-2xl text-muted-foreground">{intro}</p>{/if}
</header>
