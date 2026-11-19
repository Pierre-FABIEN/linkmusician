<script lang="ts">
	// LINKMUSICIAN: un processus (DIAGRAM-02) : déclencheur, acteurs, services,
	// entités, erreurs, diagrammes qui le documentent, processus voisins.
	import ProcessTable from '#lib/components/diagram/ProcessTable.svelte';
	import StatusBadge from '#lib/components/diagram/StatusBadge.svelte';
	import { issueHref } from '#lib/diagram/ui';

	let { data } = $props();
	const p = $derived(data.process);
</script>

<article class="space-y-6">
	<header class="space-y-2">
		<p class="lm-kicker text-muted-foreground">Processus · {data.domainLabel}</p>
		<h1 class="lm-title lm-title--sm">{p.title}</h1>
		<div class="flex flex-wrap items-center gap-2">
			<StatusBadge status={p.status} />
			<code class="text-xs">{p.id}</code>
		</div>
	</header>

	<dl class="dg-facts lm-tile lm-tile--flow">
		<div>
			<dt>Déclencheur</dt>
			<dd><code>{p.triggerText}</code></dd>
		</div>
		<div>
			<dt>Acteurs</dt>
			<dd>{p.actors.map((a) => data.actors[a] ?? a).join(', ')}</dd>
		</div>
		<div>
			<dt>Provenance</dt>
			<dd>
				{p.provenance === 'code'
					? 'Relevé dans le code'
					: p.provenance === 'issue'
						? 'Issue GitHub'
						: 'Conception'}
			</dd>
		</div>
		{#if p.services.length > 0}<div>
				<dt>Services</dt>
				<dd>
					<ul>
						{#each p.services as s (s)}<li><code>{s}</code></li>{/each}
					</ul>
				</dd>
			</div>{/if}
		{#if p.entities.length > 0}
			<div>
				<dt>Entités</dt>
				<dd class="flex flex-wrap gap-1">
					{#each p.entities as e (e)}<a
							class="lm-pill"
							href="/diagram/entites/{encodeURIComponent(e)}">{e}</a
						>{/each}
				</dd>
			</div>
		{/if}
		<div>
			<dt>Erreurs et refus</dt>
			<dd>
				{#if p.errors.length > 0}<ul>
						{#each p.errors as e, i (i)}<li>{e}</li>{/each}
					</ul>{:else}<span class="opacity-75">Non documentés.</span>{/if}
			</dd>
		</div>
		{#if p.notes}<div>
				<dt>Notes</dt>
				<dd>{p.notes}</dd>
			</div>{/if}
		{#if p.references.decisions.length + p.references.issues.length > 0}
			<div>
				<dt>Décisions et issues</dt>
				<dd class="flex flex-wrap gap-1">
					{#each p.references.decisions as d (d)}<a
							class="lm-pill"
							href="/diagram/inventaire?decision={d}">{d}</a
						>{/each}
					{#each p.references.issues as n (n)}<a
							class="lm-pill"
							href={issueHref(n)}
							target="_blank"
							rel="noopener noreferrer">#{n}</a
						>{/each}
				</dd>
			</div>
		{/if}
		{#each [['Code', p.references.sourceFiles], ['Tests', p.references.tests], ['Documents', p.references.docs]] as [label, files] (label)}
			{#if (files as string[]).length > 0}
				<div>
					<dt>{label}</dt>
					<dd>
						<ul>
							{#each files as f (f)}<li><code>{f}</code></li>{/each}
						</ul>
					</dd>
				</div>
			{/if}
		{/each}
	</dl>

	<section class="space-y-2" aria-labelledby="dg-p-diagrams">
		<h2 id="dg-p-diagrams" class="text-lg font-semibold">Dans les diagrammes</h2>
		{#if data.steps.length === 0}
			<p class="lm-note text-sm" data-tone="amber">Inventorié, diagramme détaillé à construire.</p>
		{:else}
			<ul class="space-y-1 text-sm">
				{#each data.steps as s (s.diagram.id + s.step.id)}
					<li>
						<a
							class="underline"
							href="/diagram/d/{s.diagram.slug}?noeud={encodeURIComponent(s.step.id)}"
							>{s.step.title}</a
						>
						<span class="opacity-75">— {s.diagram.title} ({s.diagram.kindLabel})</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if data.neighbours.length > 0}
		<section class="space-y-2" aria-labelledby="dg-p-near">
			<h2 id="dg-p-near" class="text-lg font-semibold">Processus qui touchent les mêmes entités</h2>
			<ProcessTable rows={data.neighbours} actors={data.actors} caption="Processus voisins" />
		</section>
	{/if}
</article>

<style>
	.dg-facts {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
		gap: 0.75rem 1.25rem;
		padding: 1rem;
		font-size: 0.875rem;
	}
	.dg-facts dt {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.8;
	}
	.dg-facts ul {
		padding-left: 1rem;
		list-style: disc;
	}
	code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.75rem;
		word-break: break-all;
	}
</style>
