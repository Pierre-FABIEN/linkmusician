<script lang="ts">
	// LINKMUSICIAN: onboarding, étape « Genres » (P1-10).
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import * as Card from '#shadcn/card';
	import { Button } from '#shadcn/button';
	import { MAX_GENRES, MAX_INFLUENCES } from '#lib/skills/profile';
	import SEO from '#lib/components/SEO.svelte';
	import { onMount } from 'svelte';
	import ProposedNotice from '#lib/components/linkmusician/onboarding/ProposedNotice.svelte';
	import { reportUsage, takeProposal } from '#lib/onboarding/proposals';

	let { data, form } = $props();
	let selected = $state<string[]>(untrack(() => form?.genreIds ?? data.current));
	const full = $derived(selected.length >= MAX_GENRES);

	// Assistant d'inscription (P3-17) : genres proposés.
	let proposed = $state(false);
	onMount(() => {
		const p = takeProposal('genres');
		if (!p?.length || selected.length) return;
		selected = p.map((g) => g.id).slice(0, MAX_GENRES);
		proposed = true;
	});
	function ignoreProposals() {
		selected = [];
		proposed = false;
		reportUsage('ignored');
	}
</script>

<SEO title="Tes genres" noindex nofollow />

<Card.Root class="shadow-xl">
	<Card.Content>
		<form method="POST" use:enhance class="space-y-5">
			<div>
				<h1 class="lm-title lm-title--sm">Tes genres</h1>
				<p class="text-sm text-muted-foreground">
					1 à {MAX_GENRES} : un genre large (« Rock ») ou précis (« Punk »). ({selected.length}/{MAX_GENRES})
				</p>
			</div>
			{#if proposed}<ProposedNotice onIgnore={ignoreProposals} />{/if}
			<div class="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
				{#each data.genres as genre (genre.id)}
					<fieldset>
						<legend class="sr-only">{genre.name}</legend>
						<div class="flex flex-wrap gap-2">
							{#each [genre, ...genre.children] as g, i (g.id)}
								{@const on = selected.includes(g.id)}
								<label
									class="cursor-pointer rounded-full border px-3 py-1.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary {on
										? 'border-transparent bg-foreground text-background'
										: full
											? 'opacity-40'
											: 'hover:border-primary'} {i === 0 ? 'font-semibold' : ''}"
								>
									<input
										type="checkbox"
										name="genreIds"
										value={g.id}
										class="sr-only"
										bind:group={selected}
										disabled={full && !on}
									/>
									{g.name}
								</label>
							{/each}
						</div>
					</fieldset>
				{/each}
			</div>
			<div class="space-y-1">
				<label for="influences" class="block text-sm font-medium"
					>Influences (facultatif, une par ligne, {MAX_INFLUENCES} au plus)</label
				>
				<textarea
					id="influences"
					name="influences"
					rows="3"
					class="lm-field w-full"
					placeholder="Vulfpeck&#10;Erykah Badu">{form?.influences ?? data.influences}</textarea
				>
			</div>
			{#if form?.error}<p class="text-sm text-destructive" role="alert">{form.error}</p>{/if}
			<div class="flex justify-between">
				<Button variant="ghost" href="/demarrer/instruments">Retour</Button>
				<Button type="submit" disabled={selected.length === 0}>Continuer</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>
