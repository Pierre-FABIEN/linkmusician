<script lang="ts">
	/**
	 * LINKMUSICIAN: rôles sur un morceau (P3-11) : un instrument du
	 * référentiel et/ou composition, paroles, arrangement. Envoie des valeurs
	 * `roles` (« INSTRUMENT:slug », « LYRICS »…), relues par `roleInputSchema`.
	 */
	import { WORK_ROLE_LABELS } from '#lib/works/rules';

	type Family = { family: string; label: string; instruments: { slug: string; name: string }[] };
	let {
		families,
		legend,
		id,
		instrumentOnly = false
	}: { families: Family[]; legend: string; id: string; instrumentOnly?: boolean } = $props();

	const writing = Object.entries(WORK_ROLE_LABELS) as [string, string][];
</script>

<fieldset class="space-y-3">
	<legend class="text-sm font-medium">{legend}</legend>
	<label class="block space-y-1 text-sm">
		<span class="text-muted-foreground">Instrument ou voix</span>
		<select
			name="roles"
			id="{id}-instrument"
			class="block min-h-11 w-full rounded-md border bg-background px-3"
		>
			<option value="">{instrumentOnly ? 'Choisir…' : 'Aucun'}</option>
			{#each families as f (f.family)}
				<optgroup label={f.label}>
					{#each f.instruments as i (i.slug)}
						<option value="INSTRUMENT:{i.slug}">{i.name}</option>
					{/each}
				</optgroup>
			{/each}
		</select>
	</label>
	{#if !instrumentOnly}
		<div class="flex flex-wrap gap-2">
			{#each writing as [kind, label] (kind)}
				<label
					class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10"
				>
					<input type="checkbox" name="roles" value={kind} class="size-4" />
					{label}
				</label>
			{/each}
		</div>
	{/if}
</fieldset>
