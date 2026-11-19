<script lang="ts">
	/**
	 * LINKMUSICIAN: recherche globale de Melokiva Diagram (DIAGRAM-02).
	 *
	 * Combobox ARIA : suggestions lues côté serveur (`/diagram/api/recherche`,
	 * garde comprise), flèches pour choisir, Entrée pour ouvrir, Échap pour
	 * fermer. Entrée sans choix : la page de résultats complète, filtrable.
	 */
	import { goto } from '$app/navigation';
	import { Search } from 'lucide-svelte';

	interface Hit {
		type: string;
		id: string;
		title: string;
		href: string;
		context: string;
	}

	let { initial = '' }: { initial?: string } = $props();

	const TYPE_LABELS: Record<string, string> = {
		diagram: 'Diagramme',
		step: 'Étape',
		process: 'Processus',
		entity: 'Entité',
		actor: 'Acteur',
		domain: 'Domaine',
		decision: 'Décision'
	};

	// Valeur de départ seulement : la saisie prend ensuite le relais.
	// svelte-ignore state_referenced_locally
	let query = $state(initial);
	let hits = $state<Hit[]>([]);
	let total = $state(0);
	let active = $state(-1);
	let expanded = $state(false);
	let loading = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let controller: AbortController | undefined;

	function fetchHits(q: string) {
		clearTimeout(timer);
		if (q.trim().length < 2) {
			hits = [];
			expanded = false;
			return;
		}
		timer = setTimeout(async () => {
			controller?.abort();
			controller = new AbortController();
			loading = true;
			try {
				const res = await fetch(`/diagram/api/recherche?q=${encodeURIComponent(q)}`, {
					signal: controller.signal
				});
				if (!res.ok) throw new Error(String(res.status));
				const body = (await res.json()) as { total: number; results: Hit[] };
				hits = body.results;
				total = body.total;
				active = -1;
				expanded = true;
			} catch (err) {
				if ((err as Error).name !== 'AbortError') {
					hits = [];
					expanded = false;
				}
			} finally {
				loading = false;
			}
		}, 160);
	}

	function open(href: string) {
		expanded = false;
		goto(href);
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' && hits.length > 0) {
			expanded = true;
			active = (active + 1) % hits.length;
		} else if (event.key === 'ArrowUp' && hits.length > 0) {
			active = active <= 0 ? hits.length - 1 : active - 1;
		} else if (event.key === 'Escape') {
			expanded = false;
			active = -1;
		} else if (event.key === 'Enter') {
			if (expanded && active >= 0 && hits[active]) open(hits[active].href);
			else if (query.trim()) open(`/diagram/recherche?q=${encodeURIComponent(query.trim())}`);
		} else return;
		event.preventDefault();
	}
</script>

<div class="dg-search" role="search">
	<label for="dg-search-input" class="sr-only">Recherche globale</label>
	<Search class="dg-search__icon size-4" aria-hidden="true" />
	<input
		id="dg-search-input"
		class="lm-field"
		type="search"
		role="combobox"
		autocomplete="off"
		placeholder="Métier, action, entité, D76, #71…"
		aria-autocomplete="list"
		aria-expanded={expanded}
		aria-controls="dg-search-list"
		aria-activedescendant={active >= 0 ? `dg-hit-${active}` : undefined}
		bind:value={query}
		oninput={() => fetchHits(query)}
		{onkeydown}
		onblur={() => setTimeout(() => (expanded = false), 150)}
		onfocus={() => hits.length > 0 && (expanded = true)}
	/>
	<span class="sr-only" aria-live="polite">
		{loading ? 'Recherche…' : expanded ? `${total} résultat${total > 1 ? 's' : ''}` : ''}
	</span>
	{#if expanded}
		<ul id="dg-search-list" class="dg-search__list lm-tile lm-tile--flow" role="listbox">
			{#each hits as hit, i (hit.type + hit.id)}
				<li
					id="dg-hit-{i}"
					role="option"
					aria-selected={i === active}
					class:is-active={i === active}
					onpointerdown={(e) => {
						e.preventDefault();
						open(hit.href);
					}}
				>
					<span class="dg-search__type">{TYPE_LABELS[hit.type] ?? hit.type}</span>
					<span class="dg-search__title">{hit.title}</span>
					<span class="dg-search__context">{hit.context}</span>
				</li>
			{:else}
				<li class="dg-search__empty" role="option" aria-selected="false">Aucun résultat.</li>
			{/each}
			{#if total > hits.length}
				<li
					role="option"
					aria-selected="false"
					class="dg-search__more"
					onpointerdown={(e) => {
						e.preventDefault();
						open(`/diagram/recherche?q=${encodeURIComponent(query.trim())}`);
					}}
				>
					Voir les {total} résultats
				</li>
			{/if}
		</ul>
	{/if}
</div>

<style>
	.dg-search {
		position: relative;
		flex: 1;
		max-width: 36rem;
	}
	.dg-search :global(.dg-search__icon) {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		z-index: 1;
		pointer-events: none;
		opacity: 0.6;
	}
	.dg-search input {
		width: 100%;
		min-height: 2.5rem;
		padding-left: 2.25rem;
	}
	.dg-search__list {
		position: absolute;
		z-index: 40;
		top: calc(100% + 0.25rem);
		left: 0;
		right: 0;
		max-height: min(70vh, 28rem);
		overflow-y: auto;
		padding: 0.25rem;
	}
	.dg-search__list li {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0 0.5rem;
		padding: 0.5rem;
		border-radius: 0.375rem;
		cursor: pointer;
	}
	.dg-search__list li.is-active,
	.dg-search__list li:hover {
		background: color-mix(in oklch, var(--lm-ink) 10%, transparent);
	}
	.dg-search__type {
		grid-row: span 2;
		align-self: start;
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		opacity: 0.7;
		min-width: 5.5rem;
	}
	.dg-search__title {
		font-weight: 600;
	}
	.dg-search__context {
		font-size: 0.75rem;
		opacity: 0.75;
	}
	.dg-search__more,
	.dg-search__empty {
		display: block !important;
		font-size: 0.8125rem;
		text-decoration: underline;
	}
	.dg-search__empty {
		text-decoration: none;
		cursor: default;
	}
</style>
