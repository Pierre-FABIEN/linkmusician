<script lang="ts">
	// LINKMUSICIAN: onboarding, étape « Ville » (P1-10). Seulement la commune,
	// jamais une position (P1-05).
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { MapPin } from 'lucide-svelte';
	import * as Card from '#shadcn/card';
	import { Button } from '#shadcn/button';
	import { TRAVEL_RADII } from '#lib/actors/profile';
	import SEO from '#lib/components/SEO.svelte';
	import { onMount } from 'svelte';
	import ProposedNotice from '#lib/components/linkmusician/onboarding/ProposedNotice.svelte';
	import { reportUsage, takeProposal } from '#lib/onboarding/proposals';

	type Suggestion = {
		code: string;
		nom: string;
		codeDepartement: string;
		codePostal: string | null;
	};
	let { data, form } = $props();

	let query = $state('');
	let suggestions = $state<Suggestion[]>([]);
	let chosen = $state<Suggestion | null>(null);
	let radius = $state(untrack(() => data.radius));
	let timer: ReturnType<typeof setTimeout> | undefined;

	function onInput() {
		chosen = null;
		clearTimeout(timer);
		if (query.trim().length < 2) return void (suggestions = []);
		timer = setTimeout(async () => {
			const q = query.trim();
			const res = await fetch(`/api/communes?q=${encodeURIComponent(q)}`);
			const body = await res.json().catch(() => ({}));
			if (q === query.trim()) suggestions = body.communes ?? [];
		}, 250);
	}
	function choose(s: Suggestion) {
		chosen = s;
		query = `${s.nom} (${s.codeDepartement})`;
		suggestions = [];
	}
	const ready = $derived(Boolean(chosen || data.location));

	// Assistant d'inscription (P3-17) : un nom de commune à chercher (le choix
	// reste dans la liste) et le rayon s'il a été dit.
	let proposed = $state(false);
	onMount(() => {
		const p = takeProposal('ville');
		if (!p || data.location) return;
		if (p.radiusKm) radius = p.radiusKm;
		if (p.communeQuery) {
			query = p.communeQuery;
			onInput();
		}
		proposed = Boolean(p.communeQuery || p.radiusKm);
	});
	function ignoreProposals() {
		query = '';
		suggestions = [];
		radius = data.radius;
		proposed = false;
		reportUsage('ignored');
	}
</script>

<SEO title="Ta ville" noindex nofollow />

<Card.Root class="shadow-xl">
	<Card.Content>
		<form method="POST" use:enhance class="space-y-5">
			<div>
				<h1 class="lm-title lm-title--sm">Où joues-tu ?</h1>
				<p class="text-sm text-muted-foreground">
					Seulement ta commune, jamais ton adresse : les autres voient une distance approximative («
					5 à 10 km »).
				</p>
			</div>
			{#if data.location && !chosen}
				<p class="flex items-center gap-2 rounded-xl border p-3">
					<MapPin class="size-5 text-muted-foreground" />
					{data.location.communeName} ({data.location.departmentCode})
				</p>
			{/if}
			{#if proposed}<ProposedNotice onIgnore={ignoreProposals} />{/if}
			<div class="relative space-y-1">
				<label for="commune" class="block text-sm font-medium"
					>{data.location ? 'Changer de commune' : 'Ta commune'}</label
				>
				<input
					id="commune"
					type="text"
					autocomplete="off"
					role="combobox"
					aria-expanded={suggestions.length > 0}
					aria-controls="commune-suggestions"
					placeholder="Nom de commune ou code postal"
					class="lm-field w-full"
					bind:value={query}
					oninput={onInput}
				/>
				{#if suggestions.length > 0}
					<ul
						id="commune-suggestions"
						role="listbox"
						class="lm-tile lm-tile--flow absolute z-10 mt-1 w-full overflow-hidden bg-background shadow-lg"
					>
						{#each suggestions as s (s.code)}
							<li role="option" aria-selected="false">
								<button
									type="button"
									class="w-full px-3 py-2 text-left text-sm hover:bg-muted"
									onclick={() => choose(s)}
								>
									{s.nom}
									<span class="text-muted-foreground">({s.codePostal ?? s.codeDepartement})</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
			<fieldset class="space-y-2">
				<legend class="text-sm font-medium">Jusqu'où te déplaces-tu ?</legend>
				<div class="flex flex-wrap gap-2">
					{#each TRAVEL_RADII as r (r)}
						<label
							class="cursor-pointer rounded-full border px-3 py-1.5 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-fuchsia-400 {radius ===
							r
								? 'border-transparent bg-foreground text-background'
								: ''}"
						>
							<input type="radio" name="radius" value={r} bind:group={radius} class="sr-only" />{r} km
						</label>
					{/each}
				</div>
			</fieldset>
			<input type="hidden" name="communeCode" value={chosen?.code ?? ''} />
			{#if form?.error}<p class="text-sm text-destructive" role="alert">{form.error}</p>{/if}
			<div class="flex justify-between">
				<Button variant="ghost" href="/demarrer/genres">Retour</Button>
				<Button type="submit" disabled={!ready}>Continuer</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>
