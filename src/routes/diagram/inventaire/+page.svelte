<script lang="ts">
	// LINKMUSICIAN: inventaire des processus (DIAGRAM-02), filtres combinables.
	import ProcessTable from '#lib/components/diagram/ProcessTable.svelte';
	import { page } from '$app/state';

	let { data } = $props();
	const TRIGGERS = [
		['action', 'Action de formulaire'],
		['endpoint', 'Endpoint'],
		['job', 'Job planifié'],
		['load', 'Lecture'],
		['none', 'Documentation seulement']
	];
	const pageHref = (n: number) => {
		const u = new URL(page.url.href);
		u.searchParams.set('page', String(n));
		return `${u.pathname}${u.search}`;
	};
</script>

<div class="space-y-4">
	<header class="space-y-2">
		<p class="lm-kicker text-muted-foreground">Inventaire</p>
		<h1 class="lm-title lm-title--sm">Processus</h1>
		<p class="text-sm">
			Chaque action de formulaire, endpoint, job et lecture clé relevés dans le code, et les
			processus seulement conçus. {data.total} résultat{data.total > 1 ? 's' : ''}.
		</p>
	</header>

	<form method="GET" class="dg-filters lm-tile lm-tile--flow" aria-label="Filtres de l’inventaire">
		<label>Mot-clé<input class="lm-field" type="search" name="q" value={data.filters.q} /></label>
		<label>
			Domaine
			<select class="lm-field" name="domaine" value={data.filters.domaine}>
				<option value="">Tous</option>
				{#each data.options.domains as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
			</select>
		</label>
		<label>
			Acteur
			<select class="lm-field" name="acteur" value={data.filters.acteur}>
				<option value="">Tous</option>
				{#each data.options.actors as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
			</select>
		</label>
		<label>
			Statut
			<select class="lm-field" name="statut" value={data.filters.statut}>
				<option value="">Tous</option>
				{#each data.options.statuses as o (o.value)}<option value={o.value}>{o.label}</option
					>{/each}
			</select>
		</label>
		<label>
			Déclencheur
			<select class="lm-field" name="declencheur" value={data.filters.declencheur}>
				<option value="">Tous</option>
				{#each TRIGGERS as [v, l] (v)}<option value={v}>{l}</option>{/each}
			</select>
		</label>
		<label>
			Diagramme
			<select class="lm-field" name="documente" value={data.filters.documente}>
				<option value="">Tous</option>
				<option value="oui">Documentés</option>
				<option value="non">À construire</option>
			</select>
		</label>
		{#if data.filters.decision}<input
				type="hidden"
				name="decision"
				value={data.filters.decision}
			/>{/if}
		{#if data.filters.issue}<input type="hidden" name="issue" value={data.filters.issue} />{/if}
		{#if data.filters.entite}<input type="hidden" name="entite" value={data.filters.entite} />{/if}
		<div class="dg-filters__actions">
			<button class="lm-btn" type="submit">Filtrer</button>
			<a class="lm-btn" data-variant="ghost" href="/diagram/inventaire">Réinitialiser</a>
		</div>
	</form>

	{#if data.filters.decision || data.filters.issue || data.filters.entite}
		<p class="text-sm">
			Restreint à
			{#if data.filters.decision}la décision <strong>{data.filters.decision}</strong>{/if}
			{#if data.filters.issue}l’issue <strong>#{data.filters.issue}</strong>{/if}
			{#if data.filters.entite}l’entité <strong>{data.filters.entite}</strong>{/if}.
		</p>
	{/if}

	<ProcessTable
		rows={data.rows}
		actors={data.actors}
		domains={data.domains}
		caption="Inventaire des processus"
	/>

	{#if data.pages > 1}
		<nav aria-label="Pages de l’inventaire" class="flex flex-wrap gap-2">
			{#each Array.from({ length: data.pages }, (_, i) => i + 1) as n (n)}
				<a
					class="lm-btn"
					data-variant={n === data.page ? undefined : 'ghost'}
					aria-current={n === data.page ? 'page' : undefined}
					href={pageHref(n)}>{n}</a
				>
			{/each}
		</nav>
	{/if}
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
	.dg-filters .lm-field {
		min-height: 2.5rem;
	}
	.dg-filters__actions {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
	}
</style>
