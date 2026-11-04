<script lang="ts">
	// LINKMUSICIAN: compte suspendu, voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	let { data } = $props();
</script>

<SEO title="Compte suspendu" noindex nofollow />

<div class="min-h-screen w-screen px-4 py-24 ccc">
	<div class="max-w-md space-y-3 rounded-lg border p-6 text-center">
		<h1 class="text-2xl font-bold">Ton compte est suspendu</h1>
		<p>
			{#if data.until}
				Jusqu'au {new Date(data.until).toLocaleDateString('fr-FR', { dateStyle: 'long' })}.
			{:else}
				Jusqu'à nouvel ordre.
			{/if}
		</p>
		<p class="text-sm text-muted-foreground">Motif : {data.reason}</p>
		<p class="text-sm text-muted-foreground">
			Pendant la suspension, ton profil et tes médias ne sont plus visibles. Pour contester,
			écris-nous depuis la page <a href="/contact" class="underline">Contact</a>.
		</p>
	</div>
</div>
