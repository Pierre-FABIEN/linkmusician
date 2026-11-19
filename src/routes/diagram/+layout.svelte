<script lang="ts">
	/**
	 * LINKMUSICIAN: coquille de Melokiva Diagram (DIAGRAM-02), sur le Sidebar
	 * de shadcn-svelte : menu latéral repliable (Ctrl+B, état retenu dans un
	 * cookie), tiroir sur téléphone, en-tête (recherche globale, contrôle) et
	 * fil d'Ariane en badges. Papier et encre Metro (`MetroPage`).
	 */
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import * as Sidebar from '#shadcn/sidebar/index.js';
	import MetroPage from '#lib/components/linkmusician/metro/MetroPage.svelte';
	import SEO from '#lib/components/SEO.svelte';
	import DiagramSidebar from '#lib/components/diagram/DiagramSidebar.svelte';
	import SearchBox from '#lib/components/diagram/SearchBox.svelte';
	import type { Crumb } from '#lib/diagram/ui';

	let { data, children } = $props();

	// État initial lu côté serveur (cookie du Sidebar) : pas de saut au chargement.
	// svelte-ignore state_referenced_locally
	let open = $state(data.sidebarOpen);
	let mainEl = $state<HTMLElement | null>(null);

	const crumbs = $derived((page.data.crumbs as Crumb[] | undefined) ?? []);
	const title = $derived(crumbs.at(-1)?.label ?? 'Vue globale');

	// Après une navigation : le focus revient au contenu, pas en haut du menu.
	afterNavigate(({ type }) => {
		if (type !== 'enter' && type !== 'popstate') mainEl?.focus({ preventScroll: true });
	});
</script>

<SEO title="{title} · Melokiva Diagram" noindex nofollow />

<MetroPage>
	<Sidebar.Provider bind:open class="dg-shell" style="--sidebar-width: 19rem;">
		<DiagramSidebar sections={data.menu} current={page.url.pathname} />
		<Sidebar.Inset class="dg-inset" tabindex={-1} bind:ref={mainEl}>
			<header class="dg-header">
				<Sidebar.Trigger label="Afficher ou masquer le menu" class="size-9" />
				<span class="dg-header__sep" aria-hidden="true"></span>
				<SearchBox
					initial={page.url.pathname === '/diagram/recherche'
						? (page.url.searchParams.get('q') ?? '')
						: ''}
				/>
				<a href="/diagram/controle" class="lm-btn dg-only-desktop" data-variant="ghost">Contrôle</a>
			</header>
			<div class="dg-main">
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
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>
</MetroPage>

<style>
	:global(.dg-shell) {
		background: var(--lm-paper);
		color: var(--lm-ink);
	}
	:global(.dg-inset) {
		min-width: 0;
		background: var(--lm-paper);
		outline: none;
	}
	.dg-header {
		position: sticky;
		top: 0;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 3.5rem;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--sidebar-border);
		background: color-mix(in oklch, var(--lm-paper) 88%, transparent);
		backdrop-filter: var(--lm-blur-sm);
	}
	.dg-header__sep {
		width: 1px;
		height: 1.25rem;
		background: var(--sidebar-border);
	}
	.dg-main {
		padding: 1rem 1.25rem 3rem;
		min-width: 0;
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
	@media (max-width: 767px) {
		.dg-only-desktop {
			display: none !important;
		}
		.dg-header {
			gap: 0.5rem;
			padding: 0.5rem 0.75rem;
		}
		.dg-main {
			padding: 0.75rem 1rem 3rem;
		}
	}
	@media print {
		.dg-header,
		.dg-crumbs,
		:global([data-slot='sidebar']) {
			display: none !important;
		}
	}
</style>
