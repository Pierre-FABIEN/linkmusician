<script lang="ts">
	// LINKMUSICIAN: un domaine (DIAGRAM-02).
	import DiagramCards from '#lib/components/diagram/DiagramCards.svelte';
	import ProcessTable from '#lib/components/diagram/ProcessTable.svelte';

	let { data } = $props();
</script>

<div class="space-y-6">
	<header class="space-y-2">
		<p class="lm-kicker text-muted-foreground">Domaine</p>
		<h1 class="lm-title lm-title--sm">{data.domain.label}</h1>
		<p class="max-w-3xl text-sm">{data.domain.description}</p>
	</header>
	<section class="space-y-2" aria-labelledby="dg-d-diag">
		<h2 id="dg-d-diag" class="text-lg font-semibold">Diagrammes ({data.diagrams.length})</h2>
		<DiagramCards cards={data.diagrams} />
	</section>
	<section class="space-y-2" aria-labelledby="dg-d-proc">
		<h2 id="dg-d-proc" class="text-lg font-semibold">
			Processus inventoriés ({data.processes.length})
		</h2>
		<ProcessTable
			rows={data.processes}
			actors={data.actors}
			caption="Processus du domaine {data.domain.label}"
		/>
	</section>
</div>
