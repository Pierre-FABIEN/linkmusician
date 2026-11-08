<script lang="ts" module>
	import type { Bell } from 'lucide-svelte';

	export type MenuItem = {
		href: string;
		title: string;
		/** Une phrase : ce qu'on trouve derrière. */
		text: string;
		/** Une icône lucide. */
		icon: typeof Bell;
		/** Petit compteur ou état (« 3 dispos », « Tu es dispo »). */
		badge?: string | null;
		/** Quelque chose attend la personne : l'entrée ressort. */
		highlight?: boolean;
	};
</script>

<script lang="ts">
	/**
	 * LINKMUSICIAN: page-menu (D50) : une liste d'entrées façon Paramètres de
	 * Windows, chacune mène à son écran. Une page d'entrée n'empile jamais
	 * de contenu : elle montre ce menu, rien de plus.
	 */
	import { ChevronRight } from 'lucide-svelte';

	let { items, label }: { items: MenuItem[]; label: string } = $props();
</script>

<nav aria-label={label}>
	<ul class="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
		{#each items as item (item.href)}
			{@const Icon = item.icon}
			<li>
				<a
					href={item.href}
					class="flex min-h-16 items-center gap-4 px-4 py-3 transition hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5 {item.highlight
						? 'bg-primary/5'
						: ''}"
				>
					<span
						class="grid size-10 shrink-0 place-items-center rounded-xl {item.highlight
							? 'bg-primary text-primary-foreground'
							: 'bg-primary/10 text-primary'}"
					>
						<Icon class="size-5" aria-hidden="true" />
					</span>
					<span class="min-w-0 flex-1">
						<span class="block font-semibold">{item.title}</span>
						<span class="block text-sm text-muted-foreground">{item.text}</span>
					</span>
					{#if item.badge}
						<span
							class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold {item.highlight
								? 'bg-primary text-primary-foreground'
								: 'bg-muted'}">{item.badge}</span
						>
					{/if}
					<ChevronRight class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
				</a>
			</li>
		{/each}
	</ul>
</nav>
