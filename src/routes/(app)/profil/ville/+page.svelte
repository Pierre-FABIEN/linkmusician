<script lang="ts">
	// LINKMUSICIAN: « Ma ville », voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '#shadcn/button';
	import SEO from '#lib/components/SEO.svelte';

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
	let searching = $state(false);
	let unavailable = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function onInput() {
		chosen = null;
		clearTimeout(timer);
		if (query.trim().length < 2) {
			suggestions = [];
			return;
		}
		timer = setTimeout(search, 250);
	}

	async function search() {
		searching = true;
		const q = query.trim();
		try {
			const res = await fetch(`/api/communes?q=${encodeURIComponent(q)}`);
			const body = await res.json();
			if (q === query.trim()) {
				suggestions = body.communes ?? [];
				unavailable = Boolean(body.unavailable);
			}
		} finally {
			searching = false;
		}
	}

	function choose(s: Suggestion) {
		chosen = s;
		query = `${s.nom} (${s.codeDepartement})`;
		suggestions = [];
	}

	$effect(() => {
		if (form?.saved) toast.success(form.saved);
		if (form?.cleared) toast.success('Ta ville est retirée.');
		if (form?.error) toast.error(form.error);
	});
</script>

<SEO title="Ma ville" noindex nofollow />

<div class="min-h-screen w-screen px-4 py-24">
	<div class="mx-auto max-w-lg space-y-6 rounded-lg border p-6 shadow-lg backdrop-blur-3xl">
		<div>
			<a href="/profil" class="text-sm text-muted-foreground underline">← Mon profil</a>
			<h1 class="mt-2 text-2xl font-bold">Ma ville</h1>
			<p class="text-sm text-muted-foreground">
				Pour trouver des musicien·nes près de toi. On n'enregistre que ta commune, jamais ton
				adresse : les autres ne voient qu'une distance approximative (« 10 à 25 km »).
			</p>
		</div>

		{#if data.location}
			<div class="flex items-center justify-between gap-2 rounded-lg border p-3">
				<span>
					<span class="block text-sm text-muted-foreground">Ta ville actuelle</span>
					<span class="font-medium"
						>{data.location.communeName} ({data.location.departmentCode})</span
					>
				</span>
				<form method="POST" action="?/clear" use:enhance>
					<Button type="submit" variant="outline" size="sm">Retirer</Button>
				</form>
			</div>
		{/if}

		<form method="POST" action="?/save" use:enhance class="space-y-3">
			<label for="commune" class="block font-semibold">
				{data.location ? 'Changer de ville' : 'Ta commune'}
			</label>
			<div class="relative">
				<input
					id="commune"
					type="text"
					autocomplete="off"
					placeholder="Nom de commune ou code postal"
					class="w-full rounded-md border bg-background p-2 text-sm"
					role="combobox"
					aria-expanded={suggestions.length > 0}
					aria-controls="commune-suggestions"
					bind:value={query}
					oninput={onInput}
				/>
				{#if suggestions.length > 0}
					<ul
						id="commune-suggestions"
						role="listbox"
						class="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-lg"
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
			{#if searching}<p class="text-xs text-muted-foreground">Recherche…</p>{/if}
			{#if unavailable}
				<p class="text-sm text-destructive">
					Le service des communes ne répond pas pour l'instant.
				</p>
			{/if}
			<input type="hidden" name="communeCode" value={chosen?.code ?? ''} />
			<Button type="submit" class="w-full" disabled={!chosen}>Enregistrer</Button>
		</form>
	</div>
</div>
