<script lang="ts">
	// LINKMUSICIAN: page provisoire de l'espace connecté (la coquille complète
	// arrive avec le lot P0-05, le choix des métiers avec P1-03b).
	import SEO from '#lib/components/SEO.svelte';

	let { data } = $props();
</script>

<SEO title="Mon espace" noindex nofollow />

<div class="w-screen min-h-screen ccc px-4">
	<div class="max-w-md text-center space-y-3">
		<h1 class="text-3xl font-bold">Salut {data.person.displayName} !</h1>
		<p class="text-muted-foreground">@{data.person.handle}</p>
		<p>Ton espace LinkMusician arrive bientôt.</p>
		{#if data.person.tracks.length === 0}
			<p class="text-sm text-muted-foreground">
				Prochaine étape : choisir tes métiers (musicien, producteur…).
			</p>
		{/if}
	</div>
</div>
