<script lang="ts">
	/**
	 * LINKMUSICIAN: choix des métiers et du métier principal (D15).
	 *
	 * Libellés et règles dans `#lib/actors/tracks`. Le métier principal ne se
	 * choisit qu'à partir de deux métiers cochés : avec un seul, il l'est
	 * d'office.
	 */
	import { untrack } from 'svelte';
	import type { SuperForm } from 'sveltekit-superforms';
	import * as Form from '#shadcn/form';
	import { Badge } from '#shadcn/badge';
	import { suggestPrimary, TRACK_LIST } from '#lib/actors/tracks';
	import type { TracksForm } from '#lib/schema/actors/tracksSchema';

	let { form }: { form: SuperForm<TracksForm> } = $props();
	// Le formulaire est créé une fois par la page : sa référence ne change pas.
	const formData = untrack(() => form.form);

	let chosenCount = $derived($formData.tracks.length);

	function syncPrimary() {
		$formData.primary = suggestPrimary($formData.tracks, $formData.primary) ?? undefined;
	}
</script>

<Form.Fieldset {form} name="tracks" class="space-y-2">
	<Form.Legend class="sr-only">Tes métiers</Form.Legend>
	<ul class="space-y-2">
		{#each TRACK_LIST as track (track.kind)}
			{@const checked = $formData.tracks.includes(track.kind)}
			<li
				class="rounded-lg border p-3 transition-colors {checked
					? 'border-primary bg-primary/5'
					: 'border-border'}"
			>
				<label class="flex cursor-pointer items-start gap-3">
					<input
						type="checkbox"
						name="tracks"
						value={track.kind}
						class="mt-1 size-4"
						bind:group={$formData.tracks}
						onchange={syncPrimary}
					/>
					<span class="flex-1">
						<span class="flex flex-wrap items-center gap-2 font-medium">
							{track.label}
							{#if !track.available}
								<Badge variant="secondary">bientôt</Badge>
							{/if}
							{#if checked && chosenCount === 1}
								<Badge>principal</Badge>
							{/if}
						</span>
						<span class="block text-sm text-muted-foreground">{track.description}</span>
					</span>
				</label>
				{#if checked && chosenCount > 1}
					<label class="mt-2 ml-7 flex cursor-pointer items-center gap-2 text-sm">
						<input
							type="radio"
							name="primary"
							value={track.kind}
							class="size-4"
							bind:group={$formData.primary}
						/>
						Mon métier principal
					</label>
				{/if}
			</li>
		{/each}
	</ul>
	{#if chosenCount === 1 && $formData.primary}
		<input type="hidden" name="primary" value={$formData.primary} />
	{/if}
	<Form.FieldErrors />
</Form.Fieldset>

<Form.Field {form} name="primary">
	<Form.FieldErrors />
</Form.Field>
