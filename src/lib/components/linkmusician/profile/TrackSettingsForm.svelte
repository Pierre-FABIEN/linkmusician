<script lang="ts">
	/**
	 * LINKMUSICIAN: « Qui voit quoi » d'un métier (ONB-12b, D61) : visibilité des
	 * trois blocs et « ouvert aux sollicitations ». Envoyé à
	 * `/profil/metier/[slug]/reglages`, qui revient ici.
	 */
	import { enhance } from '$app/forms';
	import { Button } from '#shadcn/button';
	import MetroChoice from '#lib/components/linkmusician/metro/MetroChoice.svelte';
	import {
		TRACK_BLOCK_INFO,
		TRACK_BLOCKS,
		TRACK_VISIBILITIES,
		TRACK_VISIBILITY_LABELS,
		type TrackSettings,
		type TrackVisibilityValue
	} from '#lib/actors/trackSheet';

	let {
		slug,
		settings,
		saved = false,
		error = null
	}: { slug: string; settings: TrackSettings; saved?: boolean; error?: string | null } = $props();

	const visibilityOptions = TRACK_VISIBILITIES.map((v) => ({
		value: v,
		label: TRACK_VISIBILITY_LABELS[v]
	}));
	const openOptions = [
		{ value: 'YES', label: 'Oui' },
		{ value: 'NO', label: 'Pas en ce moment' },
		{ value: 'UNKNOWN', label: 'Je ne précise pas' }
	] as const;

	// Valeurs initiales seulement : le formulaire garde ensuite les choix en cours.
	// svelte-ignore state_referenced_locally
	let values = $state<Record<(typeof TRACK_BLOCKS)[number], TrackVisibilityValue>>({
		offers: settings.offersVisibility,
		details: settings.detailsVisibility,
		conditions: settings.conditionsVisibility
	});
	// svelte-ignore state_referenced_locally
	let open = $state<'YES' | 'NO' | 'UNKNOWN'>(
		settings.openToRequests === null ? 'UNKNOWN' : settings.openToRequests ? 'YES' : 'NO'
	);
</script>

<form
	method="POST"
	action="/profil/metier/{slug}/reglages"
	use:enhance
	class="space-y-5 rounded-lg border p-4"
	aria-labelledby="reglages-titre"
	data-testid="reglages-metier"
>
	<div>
		<h2 id="reglages-titre" class="text-lg font-semibold">Qui voit quoi</h2>
		<p class="text-sm text-muted-foreground">
			Sur ta page publique. Ce qui est réservé à toi n’en sort jamais.
		</p>
	</div>
	{#each TRACK_BLOCKS as block (block)}
		<div class="space-y-1">
			<p class="text-sm font-medium">{TRACK_BLOCK_INFO[block].label}</p>
			<p class="text-xs text-muted-foreground">{TRACK_BLOCK_INFO[block].hint}</p>
			<MetroChoice
				options={visibilityOptions}
				bind:value={values[block]}
				label={TRACK_BLOCK_INFO[block].label}
				name="{block}Visibility"
			/>
		</div>
	{/each}
	<div class="space-y-1">
		<p class="text-sm font-medium">Ouvert·e aux sollicitations pour ce métier ?</p>
		<MetroChoice
			options={openOptions}
			bind:value={open}
			label="Ouvert·e aux sollicitations"
			name="openToRequests"
		/>
	</div>
	{#if error}<p class="text-sm text-destructive" role="alert">{error}</p>{/if}
	{#if saved}<p class="text-sm" role="status">Tes réglages sont enregistrés.</p>{/if}
	<Button type="submit">Appliquer ces réglages</Button>
</form>
