<script lang="ts">
	// LINKMUSICIAN: accueil de Melokiva Diagram (DIAGRAM-02).
	import DiagramDetail from '#lib/components/diagram/DiagramDetail.svelte';

	let { data } = $props();
</script>

<div class="space-y-8">
	<DiagramDetail {data} />

	<section aria-labelledby="dg-domains" class="space-y-3">
		<div class="flex flex-wrap items-end justify-between gap-2">
			<h2 id="dg-domains" class="lm-title lm-title--sm">Domaines</h2>
			<p class="text-sm text-muted-foreground">
				{data.totals.processes} processus inventoriés · {data.totals.diagrams} diagrammes ·
				{data.totals.triggers} déclencheurs relus dans le code, {data.totals.missing} non inventorié{data
					.totals.missing > 1
					? 's'
					: ''}
			</p>
		</div>
		<ul class="dg-grid" role="list">
			{#each data.coverage as row (row.domain)}
				<li>
					<a href="/diagram/domaines/{row.domain}" class="lm-tile lm-tile--flow dg-domain">
						<span class="font-semibold">{row.label}</span>
						<span class="text-sm"
							>{row.processes} processus · {row.diagrams} diagramme{row.diagrams > 1
								? 's'
								: ''}</span
						>
						<span class="dg-bar" aria-hidden="true">
							<span
								style="width: {row.implemented
									? Math.round((row.documented / row.implemented) * 100)
									: 0}%"
							></span>
						</span>
						<span class="text-xs opacity-75"
							>Documentés : {row.documented} / {row.implemented} implémentés</span
						>
					</a>
				</li>
			{/each}
		</ul>
	</section>
</div>

<style>
	.dg-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
		gap: 0.75rem;
	}
	.dg-domain {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		height: 100%;
		padding: 0.875rem;
		text-decoration: none;
		color: inherit;
	}
	.dg-bar {
		display: block;
		height: 0.375rem;
		border-radius: 999px;
		background: color-mix(in oklch, var(--lm-ink) 12%, transparent);
		overflow: hidden;
	}
	.dg-bar span {
		display: block;
		height: 100%;
		background: var(--tone-violet);
	}
</style>
