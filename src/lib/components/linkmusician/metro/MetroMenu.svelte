<script lang="ts" module>
	import type { Bell } from 'lucide-svelte';
	import type { Tone } from './tones';

	export type MetroMenuItem = {
		href: string;
		title: string;
		/** Une phrase : ce qu'on trouve derrière. */
		text: string;
		/** Icône lucide, en filigrane et à côté du titre. */
		icon: typeof Bell;
		/** Le ton du sens de l'entrée (`TONE_OF`), `paper` par défaut. */
		tone?: Tone;
		/** Au plus un résumé vivant (« 3 dispos », « jeudi 20 h »). */
		summary?: string | null;
	};
</script>

<script lang="ts">
	/**
	 * LINKMUSICIAN: accueil en menu de tuiles (D50, D55 ; `docs/design` §5).
	 * Chaque tuile est une entrée : icône, titre, une phrase, au plus un
	 * résumé vivant ; la toucher ouvre l'écran dédié. Le héros « prochaine
	 * étape », s'il y en a un, se passe en `hero` et reste en tête.
	 */
	import type { Snippet } from 'svelte';
	import Tile from './Tile.svelte';

	let {
		items,
		label,
		hero
	}: {
		items: MetroMenuItem[];
		/** Nom de la navigation, pour les lecteurs d'écran. */
		label: string;
		hero?: Snippet;
	} = $props();
</script>

<nav aria-label={label} class="space-y-3">
	{#if hero}{@render hero()}{/if}
	<ul class="lm-menu">
		{#each items as item, i (item.href)}
			{@const Icon = item.icon}
			<li class="grid">
				<Tile href={item.href} tone={item.tone ?? 'paper'} icon={item.icon} index={i}>
					<span class="lm-menu__head">
						<Icon class="size-6 shrink-0" aria-hidden="true" />
						{#if item.summary}<span class="lm-pill">{item.summary}</span>{/if}
					</span>
					<span class="space-y-1">
						<span class="lm-tile__title block">{item.title}</span>
						<span class="lm-tile__text block">{item.text}</span>
					</span>
				</Tile>
			</li>
		{/each}
	</ul>
</nav>
