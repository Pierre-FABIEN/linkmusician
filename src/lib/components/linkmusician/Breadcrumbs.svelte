<script lang="ts">
	/**
	 * LINKMUSICIAN: fil d'Ariane en badges (D52), sous l'en-tête de la
	 * coquille, sur toutes les pages de l'espace. Sur mobile, les badges
	 * défilent à l'horizontale, la page en cours visible au bout.
	 */
	import { ChevronRight, House } from 'lucide-svelte';
	import type { Crumb } from '#lib/linkmusician/breadcrumbs';

	let { crumbs }: { crumbs: Crumb[] } = $props();
	let list = $state<HTMLOListElement | null>(null);

	// La page en cours reste visible au bout du fil, même sur un petit écran.
	$effect(() => {
		void crumbs;
		if (list) list.scrollLeft = list.scrollWidth;
	});
</script>

{#if crumbs.length > 0}
	<nav aria-label="Fil d’Ariane" class="mx-auto w-full max-w-7xl px-4 pt-3 lg:px-8">
		<ol
			bind:this={list}
			class="flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
		>
			{#each crumbs as c, i (c.href)}
				{@const last = i === crumbs.length - 1}
				<li class="flex shrink-0 items-center gap-1">
					{#if i > 0}
						<ChevronRight class="size-4 text-muted-foreground" aria-hidden="true" />
					{/if}
					{#if last}
						<span
							aria-current="page"
							class="inline-flex min-h-10 items-center rounded-full bg-primary/10 px-3 text-sm font-semibold text-primary"
							>{c.label}</span
						>
					{:else}
						<a
							href={c.href}
							class="inline-flex min-h-10 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
						>
							{#if i === 0}<House class="size-4" aria-hidden="true" />{/if}{c.label}</a
						>
					{/if}
				</li>
			{/each}
		</ol>
	</nav>
{/if}
