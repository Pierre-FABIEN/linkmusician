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
	 * de contenu : elle montre ce menu, rien de plus. En Metro depuis MET-01 :
	 * une tuile `paper` découpée en lignes (`.lm-list`) ; le compteur passe
	 * sous le texte sur téléphone.
	 */
	import { ChevronRight } from 'lucide-svelte';

	let { items, label }: { items: MenuItem[]; label: string } = $props();
</script>

<nav aria-label={label}>
	<ul class="lm-tile lm-tile--flow lm-list">
		{#each items as item (item.href)}
			{@const Icon = item.icon}
			<li>
				<a href={item.href} class="lm-list__row" data-highlight={item.highlight || undefined}>
					<span class="lm-list__icon">
						<Icon class="size-5" aria-hidden="true" />
					</span>
					<span class="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
						<span class="min-w-0 flex-1">
							<span class="block font-semibold">{item.title}</span>
							<span class="block text-sm text-muted-foreground">{item.text}</span>
						</span>
						{#if item.badge}
							<span
								class="lm-pill self-start sm:self-auto"
								data-tone={item.highlight ? 'violet' : 'paper'}>{item.badge}</span
							>
						{/if}
					</span>
					<ChevronRight class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
				</a>
			</li>
		{/each}
	</ul>
</nav>
