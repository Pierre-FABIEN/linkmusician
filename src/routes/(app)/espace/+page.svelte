<script lang="ts">
	// LINKMUSICIAN: page provisoire de l'espace connecté (la coquille complète
	// arrive avec le lot P0-05).
	import SEO from '#lib/components/SEO.svelte';
	import { TRACKS } from '#lib/actors/tracks';

	let { data } = $props();

	// Métier principal en premier.
	let sortedTracks = $derived(
		[...data.person.tracks].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
	);
</script>

<SEO title="Mon espace" noindex nofollow />

<div class="w-screen min-h-screen ccc px-4">
	<div class="max-w-md text-center space-y-3">
		<h1 class="text-3xl font-bold">Salut {data.person.displayName} !</h1>
		<p class="text-muted-foreground">@{data.person.handle}</p>
		<p>Ton espace LinkMusician arrive bientôt.</p>
		<p class="text-sm text-muted-foreground">
			{#each sortedTracks as t, i (t.track)}{i > 0 ? ' · ' : ''}<span
					class={t.isPrimary ? 'font-semibold text-foreground' : ''}>{TRACKS[t.track].label}</span
				>{/each}
		</p>
		<div class="flex justify-center gap-4 text-sm">
			<a href="/profil" class="underline">Mon profil</a>
			<a href="/profil/musical" class="underline">Mon profil musical</a>
			<a href="/reglages/metiers" class="underline">Modifier mes métiers</a>
		</div>
	</div>
</div>
