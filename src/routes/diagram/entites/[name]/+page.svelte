<script lang="ts">
	// LINKMUSICIAN: une entité (DIAGRAM-02) : navigation inverse.
	import DiagramCards from '#lib/components/diagram/DiagramCards.svelte';
	import ProcessTable from '#lib/components/diagram/ProcessTable.svelte';

	let { data } = $props();
</script>

<div class="space-y-6">
	<header class="space-y-2">
		<p class="lm-kicker text-muted-foreground">Entité Prisma</p>
		<h1 class="lm-title lm-title--sm"><code>{data.name}</code></h1>
	</header>
	<section class="space-y-2" aria-labelledby="dg-e-diag">
		<h2 id="dg-e-diag" class="text-lg font-semibold">Diagrammes ({data.diagrams.length})</h2>
		<DiagramCards
			cards={data.diagrams}
			empty="Aucun diagramme ne représente encore cette entité."
		/>
	</section>
	{#if data.steps.length > 0}
		<section class="space-y-2" aria-labelledby="dg-e-steps">
			<h2 id="dg-e-steps" class="text-lg font-semibold">
				Étapes qui la lisent ou l’écrivent ({data.steps.length})
			</h2>
			<ul class="space-y-1 text-sm">
				{#each data.steps as s (s.diagram.id + s.step.id)}
					<li>
						<a
							class="underline"
							href="/diagram/d/{s.diagram.slug}?noeud={encodeURIComponent(s.step.id)}"
							>{s.step.title}</a
						>
						<span class="opacity-75"
							>— {s.diagram.title} · {[s.reads ? 'lecture' : '', s.writes ? 'écriture' : '']
								.filter(Boolean)
								.join(' et ')}</span
						>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
	<section class="space-y-2" aria-labelledby="dg-e-proc">
		<h2 id="dg-e-proc" class="text-lg font-semibold">Processus ({data.processes.length})</h2>
		<ProcessTable
			rows={data.processes}
			actors={data.actors}
			caption="Processus qui utilisent {data.name}"
		/>
	</section>
</div>
