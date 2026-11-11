<script lang="ts">
	// LINKMUSICIAN: compte suspendu, voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	let { data } = $props();
	import MetroPage from '#lib/components/linkmusician/metro/MetroPage.svelte';
</script>

<SEO title="Compte suspendu" noindex nofollow />

<MetroPage>
	<div class="min-h-screen w-screen px-4 py-24 ccc">
		<div class="lm-tile lm-tile--flow max-w-md space-y-3 p-6 text-center">
			<h1 class="lm-title lm-title--sm">Ton compte est suspendu</h1>
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
</MetroPage>
