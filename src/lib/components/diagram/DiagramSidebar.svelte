<script lang="ts">
	/**
	 * LINKMUSICIAN: menu latéral de Melokiva Diagram, sur le Sidebar de
	 * shadcn-svelte (remplace NavTree). Sections → groupes repliables →
	 * diagrammes. Un groupe fermé ne rend pas ses entrées : le menu reste léger
	 * avec des centaines de diagrammes. Le filtre ouvre ce qui correspond. Les
	 * groupes ouverts sont retenus dans le navigateur (préférence d'affichage
	 * seule). Sur téléphone, le Sidebar devient un tiroir, refermé à chaque
	 * navigation.
	 */
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Search from '@lucide/svelte/icons/search';
	import Waypoints from '@lucide/svelte/icons/waypoints';
	import MapIcon from '@lucide/svelte/icons/map';
	import BriefcaseBusiness from '@lucide/svelte/icons/briefcase-business';
	import Building2 from '@lucide/svelte/icons/building-2';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Layers from '@lucide/svelte/icons/layers';
	import Eye from '@lucide/svelte/icons/eye';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Table2 from '@lucide/svelte/icons/table-2';
	import Database from '@lucide/svelte/icons/database';
	import Gauge from '@lucide/svelte/icons/gauge';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import type { Component } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { afterNavigate } from '$app/navigation';
	import * as Sidebar from '#shadcn/sidebar/index.js';
	import * as Collapsible from '#shadcn/collapsible/index.js';
	import { useSidebar } from '#shadcn/sidebar/context.svelte.js';
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

	let { sections, current }: { sections: Section[]; current: string } = $props();

	const sidebar = useSidebar();

	const SECTION_ICONS: Record<string, Component> = {
		global: MapIcon,
		metiers: BriefcaseBusiness,
		structures: Building2,
		roles: ShieldCheck,
		domaines: Layers,
		vues: Eye,
		outils: ListChecks
	};
	const TOOL_ICONS: Record<string, Component> = {
		inventaire: Table2,
		entites: Database,
		controle: Gauge
	};

	const STORAGE = 'lm-diagram-nav';
	const open = new SvelteSet<string>();
	let filter = $state('');

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

	// Sur téléphone, le tiroir se referme une fois la page ouverte.
	afterNavigate(() => {
		if (sidebar.isMobile) sidebar.setOpenMobile(false);
	});

	function setGroup(id: string, next: boolean) {
		if (next) open.add(id);
		else open.delete(id);
		try {
			localStorage.setItem(STORAGE, JSON.stringify([...open]));
		} catch {
			/* préférence perdue, sans conséquence */
		}
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
</script>

<Sidebar.Root
	collapsible="offcanvas"
	mobileTitle="Menu des diagrammes"
	mobileDescription="Métiers, structures, rôles, domaines et vues de Melokiva Diagram."
>
	<!-- Le filtre et l’arbre forment un seul repère de navigation. -->
	<nav aria-label="Diagrammes" class="contents">
		<Sidebar.Header class="gap-3 border-b border-sidebar-border pb-3">
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton size="lg" isActive={current === '/diagram'}>
						{#snippet child({ props })}
							<a href="/diagram" {...props}>
								<span
									class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
								>
									<Waypoints class="size-4" aria-hidden="true" />
								</span>
								<span class="grid flex-1 text-left leading-tight">
									<span class="text-xs tracking-wide text-muted-foreground uppercase">Melokiva</span
									>
									<span class="dg-brand-name">Diagram</span>
								</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
			<label class="relative block">
				<span class="sr-only">Filtrer le menu</span>
				<Search
					class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 opacity-60"
					aria-hidden="true"
				/>
				<Sidebar.Input
					type="search"
					placeholder="Filtrer le menu"
					class="h-9 pl-8"
					bind:value={filter}
					autocomplete="off"
				/>
			</label>
		</Sidebar.Header>

		<Sidebar.Content>
			{#each visible as section (section.id)}
				{@const SectionIcon = SECTION_ICONS[section.id] ?? Layers}
				<Sidebar.Group>
					<Sidebar.GroupLabel class="gap-2">
						<SectionIcon aria-hidden="true" />
						{section.label}
					</Sidebar.GroupLabel>
					<Sidebar.Menu>
						{#each section.groups as group (group.id)}
							{@const ToolIcon = TOOL_ICONS[group.id]}
							{#if group.children.length === 0}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton isActive={current === group.href}>
										{#snippet child({ props })}
											<a
												href={group.href}
												aria-current={current === group.href ? 'page' : undefined}
												{...props}
											>
												{#if ToolIcon}<ToolIcon aria-hidden="true" />{/if}
												<span>{group.label}</span>
											</a>
										{/snippet}
									</Sidebar.MenuButton>
									{#if group.count > 0}
										<Sidebar.MenuBadge
											aria-label="{group.count} élément{group.count > 1 ? 's' : ''}"
											>{group.count}</Sidebar.MenuBadge
										>
									{/if}
								</Sidebar.MenuItem>
							{:else}
								<Collapsible.Root
									open={isOpen(group)}
									onOpenChange={(next) => setGroup(group.id, next)}
								>
									{#snippet child({ props })}
										<Sidebar.MenuItem {...props}>
											<Sidebar.MenuButton
												isActive={current === group.href}
												class="group-has-data-[sidebar=menu-action]/menu-item:pr-16"
											>
												{#snippet child({ props: buttonProps })}
													<a
														href={group.href}
														aria-current={current === group.href ? 'page' : undefined}
														{...buttonProps}
													>
														<span>{group.label}</span>
													</a>
												{/snippet}
											</Sidebar.MenuButton>
											<Sidebar.MenuBadge
												class="right-8"
												aria-label="{group.count} diagramme{group.count > 1 ? 's' : ''}"
												>{group.count}</Sidebar.MenuBadge
											>
											<Collapsible.Trigger>
												{#snippet child({ props: triggerProps })}
													<Sidebar.MenuAction
														{...triggerProps}
														class="data-[state=open]:rotate-90"
														aria-label="{isOpen(group) ? 'Replier' : 'Déplier'} {group.label}"
													>
														<ChevronRight aria-hidden="true" />
													</Sidebar.MenuAction>
												{/snippet}
											</Collapsible.Trigger>
											<Collapsible.Content>
												<Sidebar.MenuSub>
													{#each group.children as leaf (leaf.id)}
														<Sidebar.MenuSubItem>
															<Sidebar.MenuSubButton isActive={current === leaf.href}>
																{#snippet child({ props: leafProps })}
																	<a
																		href={leaf.href}
																		aria-current={current === leaf.href ? 'page' : undefined}
																		{...leafProps}
																		class="{leafProps.class} h-auto min-h-7 py-1"
																	>
																		<span class="truncate">{leaf.label}</span>
																		{#if leaf.status}
																			<!-- Ni rogné ni tronqué par le dernier span du bouton. -->
																			<span class="ml-auto shrink-0 overflow-visible!"
																				><StatusBadge status={leaf.status} short /></span
																			>
																		{/if}
																	</a>
																{/snippet}
															</Sidebar.MenuSubButton>
														</Sidebar.MenuSubItem>
													{/each}
												</Sidebar.MenuSub>
											</Collapsible.Content>
										</Sidebar.MenuItem>
									{/snippet}
								</Collapsible.Root>
							{/if}
						{/each}
					</Sidebar.Menu>
				</Sidebar.Group>
			{:else}
				<p class="px-4 py-2 text-sm text-muted-foreground">Rien ne correspond à « {filter} ».</p>
			{/each}
		</Sidebar.Content>
	</nav>

	<Sidebar.Footer class="border-t border-sidebar-border">
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton>
					{#snippet child({ props })}
						<a href="/" {...props}>
							<ArrowLeft aria-hidden="true" />
							<span>Retour à Melokiva</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
	<Sidebar.Rail aria-label="Replier ou déplier le menu" title="Replier ou déplier le menu" />
</Sidebar.Root>

<style>
	.dg-brand-name {
		font-family: var(--lm-font-display);
		font-weight: 300;
		font-size: 1.25rem;
		letter-spacing: -0.01em;
	}
</style>
