<script lang="ts">
	// LINKMUSICIAN: ajouter un lieu (P2-14a), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import SEO from '#lib/components/SEO.svelte';
	import CommunePicker, {
		type CommuneChoice
	} from '#lib/components/linkmusician/CommunePicker.svelte';
	import { MAX_VENUE_NAME } from '#lib/venues/rules';

	let { data, form } = $props();

	// Valeur initiale seulement : la personne choisit ensuite librement.
	// svelte-ignore state_referenced_locally
	let commune = $state<CommuneChoice | null>(data.commune);
</script>

<SEO title="Ajouter un lieu" noindex nofollow />

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-lg space-y-6 rounded-lg border p-6 shadow-lg">
		<div class="space-y-2">
			<a href="/lieux" class="text-sm text-muted-foreground underline">← Lieux de jam</a>
			<h1 class="text-2xl font-bold">Ajouter un lieu</h1>
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
			<label class="block space-y-1 font-medium">
				Nom du lieu
				<input
					name="name"
					required
					maxlength={MAX_VENUE_NAME}
					value={form?.values?.name ?? data.name}
					placeholder="Le Bar des Amis"
					class="w-full rounded-md border bg-background p-2 text-sm font-normal"
				/>
			</label>
			<label class="block space-y-1 font-medium">
				Type de lieu
				<select
					name="kind"
					required
					class="w-full rounded-md border bg-background p-2 text-sm font-normal"
				>
					<option value="">—</option>
					{#each data.kinds as k (k.value)}
						<option value={k.value} selected={form?.values?.kind === k.value}>{k.label}</option>
					{/each}
				</select>
			</label>
			<CommunePicker id="venue-commune" label="Commune du lieu" bind:chosen={commune} />
			<button
				type="submit"
				disabled={!commune}
				class="min-h-11 w-full rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50"
				>Ajouter à l’annuaire</button
			>
		</form>
	</div>
</div>
