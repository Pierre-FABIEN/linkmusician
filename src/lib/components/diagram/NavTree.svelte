<script lang="ts">
	/**
	 * LINKMUSICIAN: menu hiérarchique de Melokiva Diagram (DIAGRAM-02).
	 *
	 * Sections → groupes repliables → diagrammes. Un groupe fermé ne rend pas
	 * ses entrées : le menu reste léger avec des centaines de diagrammes. Le
	 * filtre ouvre ce qui correspond. Clavier : flèches haut et bas d'une
	 * entrée à l'autre, droite ouvre, gauche ferme, Début et Fin. Les groupes
	 * ouverts sont retenus dans le navigateur (préférence d'affichage seule).
	 */
	import { ChevronRight, Search } from 'lucide-svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { normalizeQuery } from '#lib/diagram/ui';
	import StatusBadge from './StatusBadge.svelte';
	import type { DeliveryStatus } from '#lib/diagram/types';

	interface Leaf {
		id: string;
		label: string;
		href: string;
		status?: DeliveryStatus;
	}
	interface Group {
		id: string;
		label: string;
		href: string;
		count: number;
		children: Leaf[];
	}
	interface Section {
		id: string;
		label: string;
		groups: Group[];
	}

	let {
		sections,
		current,
		onnavigate
	}: { sections: Section[]; current: string; onnavigate?: () => void } = $props();

	const STORAGE = 'lm-diagram-nav';
	const open = new SvelteSet<string>();
	let filter = $state('');
	let tree = $state<HTMLElement | null>(null);

	// Groupes retenus, puis celui de la page courante.
	$effect.pre(() => {
		try {
			for (const id of JSON.parse(localStorage.getItem(STORAGE) ?? '[]') as string[]) open.add(id);
		} catch {
			/* stockage indisponible : menu fermé */
		}
	});

	$effect(() => {
		for (const g of sections.flatMap((s) => s.groups)) {
			if (g.href === current || g.children.some((c) => current === c.href)) open.add(g.id);
		}
	});

	function remember() {
		try {
			localStorage.setItem(STORAGE, JSON.stringify([...open]));
		} catch {
			/* préférence perdue, sans conséquence */
		}
	}

	function toggle(id: string, force?: boolean) {
		const next = force ?? !open.has(id);
		if (next) open.add(id);
		else open.delete(id);
		remember();
	}

	const q = $derived(normalizeQuery(filter));
	const matches = (label: string) => q === '' || normalizeQuery(label).includes(q);

	/** Sections filtrées : un groupe reste s'il correspond ou si l'un de ses diagrammes correspond. */
	const visible = $derived(
		sections
			.map((s) => ({
				...s,
				groups: s.groups
					.map((g) => ({
						...g,
						children:
							q === '' || matches(g.label) ? g.children : g.children.filter((c) => matches(c.label))
					}))
					.filter((g) => q === '' || matches(g.label) || g.children.length > 0)
			}))
			.filter((s) => s.groups.length > 0)
	);

	const isOpen = (g: Group) => (q !== '' && g.children.length > 0) || open.has(g.id);

	function onkeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement;
		if (!tree || !target.matches('[data-nav-item]')) return;
		const items = [...tree.querySelectorAll<HTMLElement>('[data-nav-item]')];
		const i = items.indexOf(target);
		const focus = (j: number) => items[Math.max(0, Math.min(items.length - 1, j))]?.focus();
		const group = target.dataset.group;
		if (event.key === 'ArrowDown') focus(i + 1);
		else if (event.key === 'ArrowUp') focus(i - 1);
		else if (event.key === 'Home') focus(0);
		else if (event.key === 'End') focus(items.length - 1);
		else if (event.key === 'ArrowRight' && group) toggle(group, true);
		else if (event.key === 'ArrowLeft' && group) toggle(group, false);
		else return;
		event.preventDefault();
	}
</script>

<nav aria-label="Diagrammes" class="dg-nav">
	<label class="dg-nav__filter">
		<Search class="size-4 shrink-0" aria-hidden="true" />
		<span class="sr-only">Filtrer le menu</span>
		<input
			class="lm-field"
			type="search"
			placeholder="Filtrer le menu"
			bind:value={filter}
			autocomplete="off"
		/>
	</label>

	<!-- Délégation des flèches du clavier sur l’arbre. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div bind:this={tree} {onkeydown}>
		{#each visible as section (section.id)}
			<section class="dg-nav__section" aria-labelledby="dg-sec-{section.id}">
				<h2 id="dg-sec-{section.id}" class="lm-kicker">{section.label}</h2>
				<ul role="list">
					{#each section.groups as group (group.id)}
						{@const expanded = isOpen(group)}
						<li>
							<div class="dg-nav__row" class:is-current={current === group.href}>
								{#if group.children.length > 0}
									<button
										type="button"
										class="dg-nav__toggle"
										aria-expanded={expanded}
										aria-controls="dg-grp-{group.id}"
										aria-label="{expanded ? 'Replier' : 'Déplier'} {group.label}"
										data-nav-item
										data-group={group.id}
										onclick={() => toggle(group.id)}
									>
										<ChevronRight class="size-4 dg-chevron" aria-hidden="true" />
									</button>
								{:else}
									<span class="dg-nav__spacer" aria-hidden="true"></span>
								{/if}
								<a
									href={group.href}
									data-nav-item
									data-group={group.children.length > 0 ? group.id : undefined}
									aria-current={current === group.href ? 'page' : undefined}
									onclick={onnavigate}
								>
									<span class="truncate">{group.label}</span>
									{#if group.count > 0}
										<span
											class="dg-count"
											aria-label="{group.count} diagramme{group.count > 1 ? 's' : ''}"
										>
											{group.count}
										</span>
									{/if}
								</a>
							</div>
							{#if expanded}
								<ul id="dg-grp-{group.id}" class="dg-nav__leaves" role="list">
									{#each group.children as leaf (leaf.id)}
										<li>
											<a
												href={leaf.href}
												data-nav-item
												aria-current={current === leaf.href ? 'page' : undefined}
												class:is-current={current === leaf.href}
												onclick={onnavigate}
											>
												<span class="truncate">{leaf.label}</span>
												{#if leaf.status}<StatusBadge status={leaf.status} short />{/if}
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{:else}
			<p class="px-2 text-sm text-muted-foreground">Rien ne correspond à « {filter} ».</p>
		{/each}
	</div>
</nav>

<style>
	.dg-nav {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		font-size: 0.875rem;
	}
	.dg-nav__filter {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.dg-nav__filter input {
		width: 100%;
		min-height: 2.5rem;
	}
	.dg-nav__section h2 {
		margin: 0 0 0.25rem 0.25rem;
		color: var(--muted-foreground);
	}
	.dg-nav__row {
		display: flex;
		align-items: center;
		border-radius: 0.375rem;
	}
	.dg-nav__row a,
	.dg-nav__leaves a {
		display: flex;
		flex: 1;
		min-width: 0;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		min-height: 2.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		color: inherit;
		text-decoration: none;
	}
	.dg-nav__row a:hover,
	.dg-nav__leaves a:hover {
		background: color-mix(in oklch, var(--lm-ink) 8%, transparent);
	}
	.dg-nav__row.is-current a,
	.dg-nav__leaves a.is-current {
		background: var(--lm-solid);
		color: var(--lm-solid-fg);
		font-weight: 600;
	}
	.dg-nav__toggle,
	.dg-nav__spacer {
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2.25rem;
		border-radius: 0.375rem;
	}
	.dg-nav__toggle:hover {
		background: color-mix(in oklch, var(--lm-ink) 8%, transparent);
	}
	.dg-nav__toggle :global(.dg-chevron) {
		transition: transform 150ms var(--lm-ease);
	}
	.dg-nav__toggle[aria-expanded='true'] :global(.dg-chevron) {
		transform: rotate(90deg);
	}
	.dg-nav__leaves {
		margin: 0 0 0.25rem 2rem;
		border-left: 1px solid var(--lm-line);
		padding-left: 0.25rem;
	}
	.dg-count {
		flex: none;
		min-width: 1.5rem;
		border-radius: 999px;
		padding: 0 0.4rem;
		background: color-mix(in oklch, var(--lm-ink) 12%, transparent);
		text-align: center;
		font-variant-numeric: tabular-nums;
		font-size: 0.75rem;
	}
	.is-current .dg-count {
		background: color-mix(in oklch, var(--lm-solid-fg) 25%, transparent);
	}
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--ring, currentColor);
		outline-offset: 1px;
	}
	@media (prefers-reduced-motion: reduce) {
		.dg-nav__toggle :global(.dg-chevron) {
			transition: none;
		}
	}
</style>
