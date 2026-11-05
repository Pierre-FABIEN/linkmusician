<script lang="ts">
	// LINKMUSICIAN: annuaire des lieux (P2-14a), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import { MapPin, Plus, Search } from 'lucide-svelte';

	let { data } = $props();
</script>

<SEO title="Lieux de jam" noindex nofollow />

{#snippet venueList(venues: typeof data.nearby, empty: string)}
	{#if venues.length === 0}
		<p class="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">{empty}</p>
	{:else}
		<ul class="grid gap-3 sm:grid-cols-2">
			{#each venues as v (v.id)}
				<li>
					<a
						href="/lieux/{v.id}"
						class="flex min-h-16 flex-col justify-center rounded-2xl border bg-card p-4 hover:border-primary"
					>
						<span class="font-semibold">{v.name}</span>
						<span class="flex items-center gap-1 text-sm text-muted-foreground">
							<MapPin class="size-3.5" aria-hidden="true" />
							{v.kindLabel} · {v.communeName}{v.distance ? ` · ${v.distance}` : ''}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-3xl space-y-6">
		<div class="space-y-2">
			<a href="/jam" class="text-sm text-muted-foreground underline">← Mode jam</a>
			<h1 class="text-2xl font-bold">Lieux de jam</h1>
			<p class="text-sm text-muted-foreground">
				Bars, cafés-concerts, salles, MJC, locaux de répète, studios : une jam se tient toujours
				dans un lieu public ou professionnel, jamais chez quelqu'un.
			</p>
		</div>

		<form method="GET" role="search" class="flex gap-2">
			<label for="q" class="sr-only">Chercher un lieu</label>
			<input
				id="q"
				name="q"
				type="search"
				value={data.q}
				maxlength="80"
				placeholder="Nom du lieu"
				class="min-h-11 flex-1 rounded-md border bg-background px-3 text-sm"
			/>
			<button
				type="submit"
				class="inline-flex min-h-11 items-center gap-2 rounded-md border px-4 font-semibold"
			>
				<Search class="size-4" aria-hidden="true" /> Chercher
			</button>
		</form>

		<a
			href="/lieux/nouveau"
			class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
		>
			<Plus class="size-4" aria-hidden="true" /> Ajouter un lieu
		</a>

		{#if data.results}
			<section class="space-y-3" aria-labelledby="results-title">
				<h2 id="results-title" class="text-lg font-semibold">Résultats pour « {data.q} »</h2>
				{@render venueList(
					data.results,
					'Aucun lieu de ce nom pour l’instant. Ajoute-le : les autres le trouveront ensuite.'
				)}
			</section>
		{/if}

		<section class="space-y-3" aria-labelledby="nearby-title">
			<h2 id="nearby-title" class="text-lg font-semibold">
				{data.commune ? `Autour de ${data.commune}` : 'Autour de toi'}
			</h2>
			{#if data.commune}
				{@render venueList(
					data.nearby,
					'Aucun lieu dans l’annuaire près de chez toi. Ajoute le bar où se tient ta jam préférée !'
				)}
			{:else}
				<p class="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
					<a href="/profil/ville" class="underline">Indique ta ville</a> pour voir les lieux autour de
					toi.
				</p>
			{/if}
		</section>
	</div>
</div>
