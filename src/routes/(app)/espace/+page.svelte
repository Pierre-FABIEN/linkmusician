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
		<p class="text-sm text-muted-foreground">
			{#each sortedTracks as t, i (t.track)}{i > 0 ? ' · ' : ''}<span
					class={t.isPrimary ? 'font-semibold text-foreground' : ''}>{TRACKS[t.track].label}</span
				>{/each}
		</p>
		<section class="space-y-2 rounded-lg border p-4 text-left" aria-labelledby="progress-title">
			<div class="flex items-baseline justify-between">
				<h2 id="progress-title" class="font-semibold">Niveau {data.progress.level}</h2>
				<span class="text-sm text-muted-foreground">{data.progress.xp} XP</span>
			</div>
			<div
				class="h-2 overflow-hidden rounded-full bg-muted"
				role="progressbar"
				aria-label="Progression vers le niveau {data.progress.level + 1}"
				aria-valuemin={0}
				aria-valuemax={data.progress.xpForNextLevel}
				aria-valuenow={data.progress.xpIntoLevel}
			>
				<div class="h-full bg-primary" style:width="{Math.round(data.progress.ratio * 100)}%"></div>
			</div>
			<p class="text-xs text-muted-foreground">
				{data.progress.xpForNextLevel - data.progress.xpIntoLevel} XP avant le niveau {data.progress
					.level + 1}
			</p>
			{#if data.progress.achievements.length > 0}
				<ul class="flex flex-wrap gap-2 pt-1">
					{#each data.progress.achievements as a (a.id)}
						<li class="rounded-full border px-2 py-0.5 text-xs" title={a.description}>
							🏅 {a.name}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
		<div class="flex justify-center gap-4 text-sm">
			<a href="/profil" class="underline">Mon profil</a>
			<a href="/profil/musical" class="underline">Mon profil musical</a>
			<a href="/reglages/metiers" class="underline">Modifier mes métiers</a>
		</div>
	</div>
</div>
