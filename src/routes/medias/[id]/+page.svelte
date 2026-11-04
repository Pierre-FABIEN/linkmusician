<script lang="ts">
	// LINKMUSICIAN: page publique d'un média, voir +page.server.ts.
	import MediaEmbed from '#lib/components/linkmusician/MediaEmbed.svelte';
	import SEO from '#lib/components/SEO.svelte';

	let { data } = $props();
	const m = $derived(data.media);
</script>

<SEO title={m.title} />

<div class="min-h-screen w-screen px-4 py-24">
	<article class="mx-auto max-w-2xl space-y-4">
		<h1 class="text-2xl font-bold">{m.title}</h1>
		<p class="text-sm text-muted-foreground">
			{m.isDemo ? 'Démo' : 'Média'} de {m.actor.displayName} (@{m.actor.handle}){m.instrument
				? ` · ${m.instrument}`
				: ''}
		</p>
		{#if m.externalUrl}<MediaEmbed url={m.externalUrl} title={m.title} />{/if}
	</article>
</div>
