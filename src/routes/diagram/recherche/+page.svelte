<script lang="ts">
	// LINKMUSICIAN: résultats de recherche (DIAGRAM-02).
	import StatusBadge from '#lib/components/diagram/StatusBadge.svelte';

	let { data } = $props();
	const TYPE_LABELS: Record<string, string> = {
		diagram: 'Diagramme',
		step: 'Étape',
		process: 'Processus',
		entity: 'Entité',
		actor: 'Acteur',
		domain: 'Domaine',
		decision: 'Décision'
	};
</script>

<div class="space-y-4">
	<header class="space-y-2">
		<p class="lm-kicker text-muted-foreground">Recherche</p>
		<h1 class="lm-title lm-title--sm">{data.q ? `« ${data.q} »` : 'Rechercher'}</h1>
		<p class="text-sm" aria-live="polite">
			{data.total} résultat{data.total > 1 ? 's' : ''}{data.total > data.results.length
				? `, ${data.results.length} affichés`
				: ''}.
		</p>
	</header>

	<form method="GET" class="dg-filters lm-tile lm-tile--flow" aria-label="Filtres de recherche">
		<label class="dg-wide"
			>Recherche<input
				class="lm-field"
				type="search"
				name="q"
				value={data.q}
				placeholder="inviter musicien, projectNeed, concert confirmé…"
			/></label
		>
		{#each [['domaine', 'Domaine', data.options.domains], ['acteur', 'Acteur', data.options.actors], ['statut', 'Statut', data.options.statuses], ['type', 'Type de diagramme', data.options.kinds]] as [name, label, opts] (name)}
			<label>
				{label}
				<select
					class="lm-field"
					name={name as string}
					value={data.raw[name as keyof typeof data.raw]}
				>
					<option value="">Tous</option>
					{#each opts as { value: string; label: string }[] as o (o.value)}<option value={o.value}
							>{o.label}</option
						>{/each}
				</select>
			</label>
		{/each}
		<label>
			Résultat
			<select class="lm-field" name="resultat" value={data.raw.resultat}>
				<option value="">Tous</option>
				{#each Object.entries(TYPE_LABELS) as [v, l] (v)}<option value={v}>{l}</option>{/each}
			</select>
		</label>
		<div class="flex items-end"><button class="lm-btn" type="submit">Chercher</button></div>
	</form>

	<ol class="space-y-2" role="list">
		{#each data.results as r (r.type + r.id)}
			<li class="lm-tile lm-tile--flow dg-hit">
				<span class="lm-kicker text-muted-foreground">{TYPE_LABELS[r.type]}</span>
				<a class="font-semibold underline-offset-2 hover:underline" href={r.href}>{r.title}</a>
				<span class="text-sm opacity-80">{r.context}</span>
				{#if r.status}<StatusBadge status={r.status} short />{/if}
			</li>
		{:else}
			<li class="text-sm text-muted-foreground">
				Aucun résultat. Essaie un mot plus court, un métier, une entité (« ProjectNeed ») ou une
				décision (« D76 »).
			</li>
		{/each}
	</ol>
</div>

<style>
	.dg-filters {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
		gap: 0.75rem;
		padding: 1rem;
	}
	.dg-filters label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
	}
	.dg-filters .dg-wide {
		grid-column: 1 / -1;
	}
	.dg-filters .lm-field {
		min-height: 2.5rem;
	}
	.dg-hit {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.75rem;
		padding: 0.75rem 1rem;
	}
</style>
