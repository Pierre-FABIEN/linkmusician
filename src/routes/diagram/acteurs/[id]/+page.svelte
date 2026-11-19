<script lang="ts">
	// LINKMUSICIAN: un acteur (DIAGRAM-02) : ses diagrammes, puis ses processus par domaine.
	import DiagramCards from '#lib/components/diagram/DiagramCards.svelte';
	import ProcessTable from '#lib/components/diagram/ProcessTable.svelte';

	let { data } = $props();
	const KIND = { metier: 'Métier', structure: 'Structure', role: 'Rôle' } as const;
</script>

<div class="space-y-6">
	<header class="space-y-2">
		<p class="lm-kicker text-muted-foreground">
			{KIND[data.actor.kind]}{data.actor.prisma ? ` · ${data.actor.prisma}` : ''}
		</p>
		<h1 class="lm-title lm-title--sm">{data.actor.label}</h1>
		<p class="max-w-3xl text-sm">{data.actor.description}</p>
	</header>
	<section class="space-y-2" aria-labelledby="dg-a-diag">
		<h2 id="dg-a-diag" class="text-lg font-semibold">Diagrammes ({data.diagrams.length})</h2>
		<DiagramCards
			cards={data.diagrams}
			empty="Aucun parcours dessiné pour cet acteur : ses processus sont inventoriés ci-dessous, leur diagramme reste à construire."
		/>
	</section>
	<section class="space-y-4" aria-labelledby="dg-a-proc">
		<h2 id="dg-a-proc" class="text-lg font-semibold">Processus ({data.total})</h2>
		{#each data.byDomain as group (group.id)}
			<details class="space-y-2" open={data.byDomain.length <= 3}>
				<summary class="cursor-pointer font-semibold"
					>{group.label} ({group.processes.length})</summary
				>
				<ProcessTable
					rows={group.processes}
					actors={data.actors}
					caption="{group.label} — {data.actor.label}"
				/>
			</details>
		{:else}
			<p class="text-sm text-muted-foreground">Aucun processus inventorié.</p>
		{/each}
	</section>
</div>
