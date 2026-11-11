<script lang="ts">
	// LINKMUSICIAN: ajouter un lieu (P2-14a), voir +page.server.ts.
	// Suggestions d'établissements et SIRET facultatif (P2-14d, D30).
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import CommunePicker, {
		type CommuneChoice
	} from '#lib/components/linkmusician/CommunePicker.svelte';
	import { MAX_VENUE_NAME, VENUE_KIND_LABELS, type VenueKindValue } from '#lib/venues/rules';
	import { BadgeCheck } from 'lucide-svelte';

	let { data, form } = $props();

	// Valeur initiale seulement : la personne choisit ensuite librement.
	// svelte-ignore state_referenced_locally
	let commune = $state<CommuneChoice | null>(data.commune);
	// svelte-ignore state_referenced_locally
	let name = $state<string>(form?.values?.name ?? data.name);
	// svelte-ignore state_referenced_locally
	let kind = $state<string>(form?.values?.kind ?? '');
	// svelte-ignore state_referenced_locally
	let siret = $state<string>(form?.values?.siret ?? '');
	/** Recrée le choix de commune quand une suggestion la remplit. */
	let communeKey = $state(0);

	type Suggestion = {
		siret: string;
		name: string;
		kind: VenueKindValue | null;
		commune: CommuneChoice;
	};
	let suggestions = $state<Suggestion[]>([]);
	let chosenSiret = $state<string | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function onNameInput() {
		clearTimeout(timer);
		if (chosenSiret) {
			chosenSiret = null;
			siret = '';
		}
		if (name.trim().length < 3) {
			suggestions = [];
			return;
		}
		timer = setTimeout(async () => {
			const q = name.trim();
			const res = await fetch(`/api/etablissements?q=${encodeURIComponent(q)}`);
			if (res.ok && q === name.trim()) suggestions = (await res.json()).establishments ?? [];
		}, 250);
	}

	function choose(s: Suggestion) {
		name = s.name;
		if (s.kind) kind = s.kind;
		siret = s.siret;
		chosenSiret = s.siret;
		commune = s.commune;
		communeKey++;
		suggestions = [];
	}
</script>

<SEO title="Ajouter un lieu" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-4xl space-y-6">
		<div class="space-y-2">
			<a href="/lieux" class="text-sm text-muted-foreground underline">← Lieux de jam</a>
			<h1 class="lm-title">Ajouter un lieu</h1>
			<p class="text-sm text-muted-foreground">
				Un lieu public ou professionnel : bar, café-concert, salle, MJC, local de répète, studio…
				Jamais un domicile. On n'enregistre que la commune, pas l'adresse.
			</p>
		</div>

		{#if form?.error}
			<div role="alert" class="space-y-1 rounded-md border border-destructive p-3 text-sm">
				<p class="text-destructive">{form.error}</p>
				{#if form.existingId}
					<a href="/lieux/{form.existingId}" class="font-semibold underline">Voir ce lieu</a>
				{/if}
			</div>
		{/if}

		<form method="POST" use:enhance class="space-y-4">
			<div class="space-y-1">
				<label for="venue-name" class="block font-medium">Nom du lieu</label>
				<input
					id="venue-name"
					name="name"
					required
					autocomplete="off"
					maxlength={MAX_VENUE_NAME}
					bind:value={name}
					oninput={onNameInput}
					placeholder="Le Bar des Amis"
					role="combobox"
					aria-expanded={suggestions.length > 0}
					aria-controls="venue-suggestions"
					class="lm-field w-full"
				/>
				{#if suggestions.length > 0}
					<ul
						id="venue-suggestions"
						aria-label="Établissements connus"
						class="divide-y rounded-md border bg-card text-sm shadow"
					>
						{#each suggestions as s (s.siret)}
							<li>
								<button
									type="button"
									onclick={() => choose(s)}
									class="flex min-h-11 w-full flex-col items-start px-3 py-2 text-left hover:bg-muted"
								>
									<span class="font-semibold">{s.name}</span>
									<span class="text-muted-foreground"
										>{s.kind ? `${VENUE_KIND_LABELS[s.kind]} · ` : ''}{s.commune.nom}</span
									>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				{#if chosenSiret}
					<p class="flex items-center gap-1 text-sm text-primary">
						<BadgeCheck class="size-4" aria-hidden="true" /> Établissement connu : le lieu sera vérifié
						tout de suite.
					</p>
				{/if}
			</div>
			<label class="block space-y-1 font-medium">
				Type de lieu
				<select name="kind" required bind:value={kind} class="lm-field w-full">
					<option value="">—</option>
					{#each data.kinds as k (k.value)}
						<option value={k.value}>{k.label}</option>
					{/each}
				</select>
			</label>
			{#key communeKey}
				<CommunePicker id="venue-commune" label="Commune du lieu" bind:chosen={commune} />
			{/key}
			<label class="block space-y-1 font-medium">
				Numéro SIRET <span class="font-normal text-muted-foreground">(facultatif)</span>
				<input
					name="siret"
					inputmode="numeric"
					autocomplete="off"
					maxlength="17"
					bind:value={siret}
					placeholder="14 chiffres"
					class="lm-field w-full"
				/>
				<span class="block text-sm font-normal text-muted-foreground"
					>Tu gères ce lieu ou tu connais son SIRET ? Il est vérifié auprès de l’Insee et le lieu
					est validé tout de suite.</span
				>
			</label>
			<button type="submit" disabled={!commune} class="lm-btn w-full disabled:opacity-50"
				>Ajouter à l’annuaire</button
			>
		</form>
	</div>
</div>
