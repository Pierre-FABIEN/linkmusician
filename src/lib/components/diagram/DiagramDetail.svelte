<script lang="ts">
	/**
	 * LINKMUSICIAN: un diagramme complet (DIAGRAM-03) : filtres, visualiseur,
	 * panneau du nœud choisi, diagrammes liés, rendu textuel, export. Le nœud
	 * choisi vit dans l'URL (`?noeud=`) : un lien partagé rouvre le même nœud.
	 */
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { Download, Printer } from 'lucide-svelte';
	import type { DiagramDefinition, DrawioModel, DeliveryStatus } from '#lib/diagram/types';
	import DiagramViewer from './DiagramViewer.svelte';
	import StepPanel from './StepPanel.svelte';
	import StatusBadge from './StatusBadge.svelte';

	interface Card {
		id: string;
		slug: string;
		title: string;
		kindLabel: string;
		status: DeliveryStatus;
	}

	let {
		data
	}: {
		data: {
			diagram: DiagramDefinition & { kindLabel: string };
			model: DrawioModel | null;
			modelError: string | null;
			order: string[];
			actors: Record<string, string>;
			domainLabel: string;
			processes: Record<string, { id: string; title: string; trigger: string }>;
			gotos: Record<string, { href: string; label: string } | null>;
			parents: Card[];
			children: Card[];
			related: Card[];
			citedBy: Card[];
		};
	} = $props();

	const d = $derived(data.diagram);
	const stepById = $derived(new Map(d.steps.map((s) => [s.id, s])));
	const wanted = $derived(page.url.searchParams.get('noeud'));
	let chosen = $state<string | null | undefined>(undefined);
	const selected = $derived(
		chosen === undefined ? (wanted && stepById.has(wanted) ? wanted : null) : chosen
	);
	let actorFilter = $state('');
	let showAlternatives = $state(true);

	const step = $derived(selected ? (stepById.get(selected) ?? null) : null);
	const stepActors = $derived([...new Set(d.steps.map((s) => s.actor))]);
	const ordered = $derived(data.order.map((id) => stepById.get(id)!).filter(Boolean));

	function select(id: string | null) {
		chosen = id;
		const url = new URL(page.url.href);
		if (id) url.searchParams.set('noeud', id);
		else url.searchParams.delete('noeud');
		replaceState(url, {});
	}

	const linkGroups = $derived(
		[
			['Diagramme parent', data.parents],
			['Sous-processus', data.children],
			['Diagrammes liés', data.related],
			['Cité par', data.citedBy]
		].filter(([, list]) => (list as Card[]).length > 0) as [string, Card[]][]
	);
</script>

<div class="dg-detail">
	<header class="dg-detail__head">
		<p class="lm-kicker text-muted-foreground">{d.kindLabel} · {data.domainLabel}</p>
		<h1 class="lm-title lm-title--sm">{d.title}</h1>
		<p class="max-w-3xl text-sm">{d.description}</p>
		<div class="dg-detail__meta">
			<StatusBadge status={d.status} />
			<span class="text-xs opacity-75"
				>{d.steps.length} étapes · source <code>{d.source}</code></span
			>
		</div>
	</header>

	<div class="dg-detail__filters" role="group" aria-label="Filtres du diagramme">
		<label class="dg-filter">
			<span>Acteur</span>
			<select class="lm-field" bind:value={actorFilter}>
				<option value="">Tous</option>
				{#each stepActors as a (a)}<option value={a}>{data.actors[a] ?? a}</option>{/each}
			</select>
		</label>
		<label class="dg-filter dg-filter--check">
			<input type="checkbox" bind:checked={showAlternatives} />
			<span>Chemins alternatifs et échecs</span>
		</label>
		<span class="dg-filter__spacer"></span>
		<a class="lm-btn" data-variant="ghost" href="/diagram/d/{d.slug}/svg" download="{d.slug}.svg">
			<Download class="size-4" aria-hidden="true" /> SVG
		</a>
		<button type="button" class="lm-btn" data-variant="ghost" onclick={() => window.print()}>
			<Printer class="size-4" aria-hidden="true" /> PDF
		</button>
	</div>

	<div class="dg-detail__body" class:has-panel={Boolean(step)}>
		{#if data.model}
			<DiagramViewer
				cells={data.model.cells}
				width={data.model.width}
				height={data.model.height}
				steps={d.steps}
				title={d.title}
				{selected}
				{actorFilter}
				{showAlternatives}
				onselect={select}
			/>
		{:else}
			<div class="lm-alert" role="alert">
				Le diagramme ne peut pas être affiché : {data.modelError}. Le rendu textuel ci-dessous reste
				disponible.
			</div>
		{/if}
		{#if step}
			<aside aria-live="polite" class="dg-detail__panel">
				<StepPanel
					{step}
					actorLabel={data.actors[step.actor] ?? step.actor}
					process={step.process ? (data.processes[step.process] ?? null) : null}
					gotoHref={data.gotos[step.id]?.href ?? null}
					gotoLabel={data.gotos[step.id]?.label ?? null}
					onclose={() => select(null)}
				/>
			</aside>
		{:else}
			<p class="dg-detail__hint text-sm text-muted-foreground">
				Choisis un nœud (clic, ou Tab puis Entrée) pour voir son acteur, ses conditions, les données
				lues et modifiées et ses conséquences.
			</p>
		{/if}
	</div>

	{#if linkGroups.length > 0}
		<nav class="dg-detail__links" aria-label="Diagrammes associés">
			{#each linkGroups as [label, list] (label)}
				<section>
					<h2 class="lm-kicker">{label}</h2>
					<ul>
						{#each list as card (card.id)}
							<li>
								<a href="/diagram/d/{card.slug}" class="underline">{card.title}</a>
								<span class="text-xs opacity-75">{card.kindLabel}</span>
								<StatusBadge status={card.status} short />
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</nav>
	{/if}

	<details class="dg-detail__text lm-tile lm-tile--flow">
		<summary>Rendu textuel du diagramme ({ordered.length} étapes)</summary>
		<ol>
			{#each ordered as s (s.id)}
				<li id="txt-{s.id}">
					<button
						type="button"
						class="font-semibold underline-offset-2 hover:underline"
						onclick={() => select(s.id)}
					>
						{s.title}
					</button>
					<span class="text-xs opacity-75"> — {data.actors[s.actor] ?? s.actor}</span>
					{#if s.next.length > 0}
						<div class="text-sm">
							Ensuite : {s.next.map((n) => stepById.get(n)?.title ?? n).join(' ; ')}
						</div>
					{/if}
					{#if s.alternatives.length > 0}
						<div class="text-sm">
							Sinon : {s.alternatives.map((n) => stepById.get(n)?.title ?? n).join(' ; ')}
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	</details>
</div>

<style>
	.dg-detail {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.dg-detail__head {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	.dg-detail__meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	.dg-detail__filters {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem;
	}
	.dg-filter {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
	}
	.dg-filter select {
		min-height: 2.5rem;
		min-width: 12rem;
	}
	.dg-filter--check {
		flex-direction: row;
		align-items: center;
		min-height: 2.5rem;
		font-weight: 500;
		font-size: 0.875rem;
	}
	.dg-filter__spacer {
		flex: 1;
	}
	.dg-detail__body {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
	}
	.dg-detail__body.has-panel {
		grid-template-columns: minmax(0, 1fr) minmax(18rem, 26rem);
	}
	.dg-detail__panel {
		max-height: min(70dvh, 46rem);
		overflow-y: auto;
	}
	.dg-detail__links {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: 1rem;
	}
	.dg-detail__links ul {
		display: grid;
		gap: 0.375rem;
		margin-top: 0.25rem;
		font-size: 0.875rem;
	}
	.dg-detail__links li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}
	.dg-detail__text {
		padding: 1rem;
	}
	.dg-detail__text summary {
		cursor: pointer;
		font-weight: 600;
	}
	.dg-detail__text ol {
		display: grid;
		gap: 0.625rem;
		margin-top: 0.75rem;
		padding-left: 1.25rem;
		list-style: decimal;
	}
	code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.75rem;
	}
	@media (max-width: 1100px) {
		.dg-detail__body.has-panel {
			grid-template-columns: minmax(0, 1fr);
		}
		.dg-detail__panel {
			max-height: none;
		}
	}
	@media print {
		.dg-detail__filters,
		.dg-detail__hint {
			display: none;
		}
		.dg-detail__text {
			display: block;
		}
	}
</style>
