<script lang="ts">
	/**
	 * LINKMUSICIAN: coquille de Melokiva Diagram (DIAGRAM-02). En-tête
	 * (marque, recherche globale), menu latéral repliable, tiroir sur mobile,
	 * fil d'Ariane de la page. Papier et encre Metro (`MetroPage`).
	 */
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-svelte';
	import MetroPage from '#lib/components/linkmusician/metro/MetroPage.svelte';
	import SEO from '#lib/components/SEO.svelte';
	import NavTree from '#lib/components/diagram/NavTree.svelte';
	import SearchBox from '#lib/components/diagram/SearchBox.svelte';
	import type { Crumb } from '#lib/diagram/ui';

	let { data, children } = $props();

	let collapsed = $state(false);
	let drawer = $state<HTMLDialogElement | null>(null);
	let mainEl = $state<HTMLElement | null>(null);

	const current = $derived(
		page.url.pathname + (page.url.pathname.startsWith('/diagram/d/') ? '' : '')
	);
	const crumbs = $derived((page.data.crumbs as Crumb[] | undefined) ?? []);
	const title = $derived(crumbs.at(-1)?.label ?? 'Vue globale');

	function openDrawer() {
		drawer?.showModal();
	}
	function closeDrawer() {
		drawer?.close();
	}

	// Après une navigation : le focus revient au contenu, pas en haut du menu.
	afterNavigate(({ type }) => {
		if (type !== 'enter' && type !== 'popstate') mainEl?.focus({ preventScroll: true });
	});
</script>

<SEO title="{title} · Melokiva Diagram" noindex nofollow />

<MetroPage>
	<div class="dg-app" class:is-collapsed={collapsed}>
		<header class="dg-header">
			<button
				type="button"
				class="dg-icon-btn dg-only-mobile"
				onclick={openDrawer}
				aria-label="Ouvrir le menu"
			>
				<Menu class="size-5" aria-hidden="true" />
			</button>
			<button
				type="button"
				class="dg-icon-btn dg-only-desktop"
				onclick={() => (collapsed = !collapsed)}
				aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'}
				aria-expanded={!collapsed}
				aria-controls="dg-sidebar"
			>
				{#if collapsed}<PanelLeftOpen class="size-5" aria-hidden="true" />{:else}<PanelLeftClose
						class="size-5"
						aria-hidden="true"
					/>{/if}
			</button>
			<a href="/diagram" class="dg-brand">
				<span class="lm-kicker">Melokiva</span>
				<span class="dg-brand__name">Diagram</span>
			</a>
			<SearchBox
				initial={page.url.pathname === '/diagram/recherche'
					? (page.url.searchParams.get('q') ?? '')
					: ''}
			/>
			<a href="/diagram/controle" class="lm-btn dg-only-desktop" data-variant="ghost">Contrôle</a>
		</header>

		{#if !collapsed}
			<aside id="dg-sidebar" class="dg-sidebar dg-only-desktop">
				<NavTree sections={data.menu} {current} />
			</aside>
		{/if}

		<main class="dg-main" tabindex="-1" bind:this={mainEl}>
			{#if crumbs.length > 1}
				<nav aria-label="Fil d’Ariane" class="dg-crumbs">
					<ol>
						{#each crumbs as crumb, i (crumb.href)}
							<li>
								{#if i < crumbs.length - 1}
									<a href={crumb.href} class="lm-crumb">{crumb.label}</a>
								{:else}
									<span aria-current="page">{crumb.label}</span>
								{/if}
							</li>
						{/each}
					</ol>
				</nav>
			{/if}
			{@render children()}
		</main>
	</div>

	<dialog bind:this={drawer} class="dg-drawer" aria-label="Menu des diagrammes">
		<div class="dg-drawer__head">
			<span class="font-semibold">Menu</span>
			<button type="button" class="dg-icon-btn" onclick={closeDrawer} aria-label="Fermer le menu">
				<X class="size-5" aria-hidden="true" />
			</button>
		</div>
		<NavTree sections={data.menu} {current} onnavigate={closeDrawer} />
	</dialog>
</MetroPage>

<style>
	.dg-app {
		display: grid;
		grid-template-columns: 19rem minmax(0, 1fr);
		grid-template-rows: auto minmax(0, 1fr);
		height: 100dvh;
		width: 100vw;
		overflow: hidden;
		background: var(--lm-paper);
		color: var(--lm-ink);
	}
	.dg-app.is-collapsed {
		grid-template-columns: minmax(0, 1fr);
	}
	.dg-header {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--lm-line);
		background: color-mix(in oklch, var(--lm-paper) 92%, var(--lm-ink));
	}
	.dg-brand {
		display: flex;
		flex-direction: column;
		line-height: 1;
		text-decoration: none;
		color: inherit;
		margin-right: 0.5rem;
	}
	.dg-brand__name {
		font-family: var(--lm-font-display);
		font-weight: 300;
		font-size: 1.5rem;
		letter-spacing: -0.01em;
	}
	.dg-sidebar {
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 1rem 0.75rem 2rem;
		border-right: 1px solid var(--lm-line);
	}
	.dg-main {
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 1rem 1.25rem 3rem;
		outline: none;
	}
	.dg-crumbs ol {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.5rem;
		margin-bottom: 0.75rem;
		font-size: 0.8125rem;
	}
	.dg-crumbs li + li::before {
		content: '›';
		margin-right: 0.5rem;
		opacity: 0.6;
	}
	.dg-icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.5rem;
	}
	.dg-icon-btn:hover {
		background: color-mix(in oklch, var(--lm-ink) 8%, transparent);
	}
	.dg-drawer {
		margin: 0;
		height: 100dvh;
		max-height: 100dvh;
		width: min(22rem, 88vw);
		padding: 0.75rem;
		background: var(--lm-paper);
		color: var(--lm-ink);
		overflow-y: auto;
	}
	.dg-drawer::backdrop {
		background: oklch(0 0 0 / 0.45);
	}
	.dg-drawer__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}
	.dg-only-mobile {
		display: none;
	}
	@media (max-width: 900px) {
		.dg-app,
		.dg-app.is-collapsed {
			grid-template-columns: minmax(0, 1fr);
		}
		.dg-only-desktop {
			display: none !important;
		}
		.dg-only-mobile {
			display: inline-flex;
		}
		.dg-brand__name {
			font-size: 1.25rem;
		}
		.dg-main {
			padding: 0.75rem 1rem 3rem;
		}
	}
	@media print {
		.dg-header,
		.dg-sidebar,
		.dg-crumbs {
			display: none !important;
		}
		.dg-app {
			display: block;
			height: auto;
			overflow: visible;
		}
		.dg-main {
			overflow: visible;
		}
	}
</style>
