<script lang="ts" module>
	export type CommuneChoice = { code: string; nom: string; codeDepartement: string };
</script>

<script lang="ts">
	// LINKMUSICIAN: choix d'une commune (autocomplétion `/api/communes`). Le
	// formulaire n'envoie que le code INSEE : le serveur relit la commune.

	type Suggestion = CommuneChoice & { codePostal: string | null };

	let {
		id = 'commune',
		label = 'Commune',
		name = 'communeCode',
		chosen = $bindable(null)
	}: {
		id?: string;
		label?: string;
		name?: string;
		chosen?: CommuneChoice | null;
	} = $props();

	const display = (c: CommuneChoice) => `${c.nom} (${c.codeDepartement})`;

	let query = $state(chosen ? display(chosen) : '');
	let suggestions = $state<Suggestion[]>([]);
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
		chosen = { code: s.code, nom: s.nom, codeDepartement: s.codeDepartement };
		query = display(chosen);
		suggestions = [];
	}
</script>

<div class="space-y-1">
	<label for={id} class="block font-medium">{label}</label>
	<div class="relative">
		<input
			{id}
			type="text"
			autocomplete="off"
			placeholder="Nom de commune ou code postal"
			class="lm-field w-full"
			role="combobox"
			aria-expanded={suggestions.length > 0}
			aria-controls="{id}-suggestions"
			bind:value={query}
			oninput={onInput}
		/>
		{#if suggestions.length > 0}
			<ul
				id="{id}-suggestions"
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
		<p class="text-sm text-destructive">Le service des communes ne répond pas pour l'instant.</p>
	{/if}
	<input type="hidden" {name} value={chosen?.code ?? ''} />
</div>
