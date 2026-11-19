<script lang="ts">
	// LINKMUSICIAN: une vue transversale (DIAGRAM-02).
	import DiagramCards from '#lib/components/diagram/DiagramCards.svelte';
	import ProcessTable from '#lib/components/diagram/ProcessTable.svelte';
	import StatusBadge from '#lib/components/diagram/StatusBadge.svelte';
	import { issueHref } from '#lib/diagram/ui';

	let { data } = $props();
	const INTRO: Record<string, string> = {
		parcours:
			'Parcours utilisateurs de bout en bout, avec leurs bifurcations, et répartition des responsabilités en couloirs.',
		dataflows:
			'Du formulaire à PostgreSQL : validation, contrôle des droits, verrous, transaction, effets réels.',
		permissions:
			'Qui peut quoi, dans quel état, et ce que voit qui ne peut pas — relevé des étapes documentées.',
		donnees: 'Entités, clés, cardinalités, cascades ; relations calculées en pointillé.',
		etats: 'Cycles de vie et qui déclenche chaque transition.',
		evenements:
			'Processus qui touchent la progression : événements, registre d’XP, confiance, réputation. Le client n’envoie jamais de valeur de progression.',
		evolutions:
			'Ce qui est conçu, prévu ou remplacé, avec ses décisions et ses issues : aucune de ces entrées n’a de code.'
	};
</script>

<div class="space-y-6">
	<header class="space-y-2">
		<p class="lm-kicker text-muted-foreground">Vue</p>
		<h1 class="lm-title lm-title--sm">{data.view.label}</h1>
		<p class="max-w-3xl text-sm">{INTRO[data.view.id]}</p>
	</header>

	{#if !['evenements', 'evolutions'].includes(data.view.id)}
		<DiagramCards cards={data.diagrams} empty="Aucun diagramme de ce type pour l’instant." />
	{/if}

	{#if data.view.id === 'permissions'}
		<div class="dg-table-wrap">
			<table class="dg-perm">
				<caption class="sr-only">Permissions documentées par étape</caption>
				<thead
					><tr
						><th scope="col">Étape</th><th scope="col">Qui peut</th><th scope="col"
							>Préconditions</th
						><th scope="col">Sinon</th></tr
					></thead
				>
				<tbody>
					{#each data.permissions as row (row.diagram.slug + row.step.id)}
						<tr>
							<td>
								<a
									class="underline"
									href="/diagram/d/{row.diagram.slug}?noeud={encodeURIComponent(row.step.id)}"
									>{row.step.title}</a
								>
								<span class="block text-xs opacity-70">{row.diagram.title}</span>
							</td>
							<td
								><ul>
									{#each row.permissions as p, i (i)}<li>{p}</li>{/each}
								</ul></td
							>
							<td
								><ul>
									{#each row.preconditions as p, i (i)}<li>{p}</li>{/each}
								</ul></td
							>
							<td
								><ul>
									{#each row.errors as p, i (i)}<li>{p}</li>{/each}
								</ul></td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if data.view.id === 'evenements'}
		<ProcessTable rows={data.progression} actors={data.actors} caption="Processus de progression" />
	{/if}

	{#if data.view.id === 'evolutions'}
		<ul class="space-y-3" role="list">
			{#each data.evolutions as e (e.id)}
				<li class="lm-tile lm-tile--flow space-y-1 p-4">
					<div class="flex flex-wrap items-center gap-2">
						<a
							class="font-semibold underline-offset-2 hover:underline"
							href="/diagram/processus/{encodeURIComponent(e.id)}">{e.title}</a
						>
						<StatusBadge status={e.status} />
					</div>
					<p class="text-sm">{e.notes}</p>
					<div class="flex flex-wrap gap-1 text-xs">
						{#each e.decisions as d (d)}<a class="lm-pill" href="/diagram/inventaire?decision={d}"
								>{d}</a
							>{/each}
						{#each e.issues as n (n)}<a
								class="lm-pill"
								href={issueHref(n)}
								target="_blank"
								rel="noopener noreferrer">#{n}</a
							>{/each}
						{#each e.docs as doc (doc)}<code>{doc}</code>{/each}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.dg-table-wrap {
		overflow-x: auto;
		border: 1px solid var(--lm-line);
		border-radius: 0.75rem;
	}
	.dg-perm {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}
	.dg-perm th {
		text-align: left;
		padding: 0.5rem 0.75rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		background: color-mix(in oklch, var(--lm-ink) 6%, transparent);
	}
	.dg-perm td {
		vertical-align: top;
		padding: 0.5rem 0.75rem;
		border-top: 1px solid color-mix(in oklch, var(--lm-line) 50%, transparent);
	}
	.dg-perm ul {
		padding-left: 1rem;
		list-style: disc;
	}
	code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}
</style>
